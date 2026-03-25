interface AgentBody {
  scenarioId?: string;
  query?: string;
  stream?: boolean;
  inputs?: Record<string, unknown>;
}

type CorsHandler = (req: any, res: any) => boolean;
function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const handleCors: CorsHandler = (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  return false;
};

interface AppforgeEventEnvelope {
  event?: string;
  data?: Record<string, unknown>;
}

interface AppforgeContentEnvelope {
  type?: string;
  content?: string;
}

type AgentType = 'workflow' | 'content-stream';

interface AgentDefinition {
  appId: string;
  token: string;
  agentType: AgentType;
}

interface QwenChatResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string; type?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

const APPFORGE_BASE_URL =
  process.env.APPFORGE_BASE_URL || 'http://110.154.34.22:37755/appforge/openapi/v1';

const APPFORGE_DEFAULT_TOKEN = '6b9dbe0086d15f7da69c34573af37de1';

const AGENT_REGISTRY: Record<string, AgentDefinition> = {
  'report-compile': {
    appId: process.env.APPFORGE_REPORT_COMPILE_APP_ID || 'app-6p23bh2c',
    token: process.env.APPFORGE_REPORT_COMPILE_TOKEN || APPFORGE_DEFAULT_TOKEN,
    agentType: 'workflow',
  },
  'official-doc': {
    appId: process.env.APPFORGE_OFFICIAL_DOC_APP_ID || 'app-nj4mkuyx',
    token: process.env.APPFORGE_OFFICIAL_DOC_TOKEN || APPFORGE_DEFAULT_TOKEN,
    agentType: 'content-stream',
  },
  'oil-gas': {
    appId: process.env.APPFORGE_OIL_GAS_APP_ID || 'app-c8kfj18j',
    token: process.env.APPFORGE_OIL_GAS_TOKEN || APPFORGE_DEFAULT_TOKEN,
    agentType: 'workflow',
  },
};

const BUILTIN_SCENARIO_IDS = new Set([
  'product-weekly',
  'market-research',
  'bid-document',
  'business-report',
]);

const MESSAGE_OUTPUT_KEYS = ['message', 'msg-output', 'msg_output', 'msgOutput', 'reply'];
const MESSAGE_NODE_TYPES = new Set([
  'msg-output',
  'msg_output',
  'msgoutput',
  'message',
  'message-output',
  'message_output',
  'messageoutput',
]);
const FINAL_OUTPUT_KEYS = [
  'report',
  'result',
  'content',
  'answer',
  'article',
  'markdown',
  'fullText',
  'full_text',
  'text',
];

const DEFAULT_QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DEFAULT_QWEN_MODEL = 'qwen-plus';

function getBody(rawBody: unknown): AgentBody {
  if (!rawBody) return {};
  if (typeof rawBody === 'string') {
    try {
      return JSON.parse(rawBody) as AgentBody;
    } catch {
      return {};
    }
  }
  return rawBody as AgentBody;
}

function getInputs(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => {
    if (typeof item === 'string') {
      return item.trim().length > 0;
    }
    return item !== undefined && item !== null;
  });

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function extractQwenContent(data: QwenChatResponse): string {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content.map((item) => item.text || '').join('').trim();
  }
  return '';
}

function getScenarioLabel(scenarioId: string): string {
  if (scenarioId === 'oil-gas') {
    return '油气价格分析';
  }
  if (scenarioId === 'official-doc') {
    return '公文写作智能体';
  }
  if (scenarioId === 'report-compile') {
    return 'Osint开源情报整编智能体';
  }
  if (scenarioId === 'product-weekly') {
    return '产品周报整理';
  }
  if (scenarioId === 'market-research') {
    return '市场研究报告生成';
  }
  if (scenarioId === 'bid-document') {
    return '招标文档专家';
  }
  if (scenarioId === 'business-report') {
    return '经营报告生成';
  }
  return '指定智能体';
}

function openSseStream(res: any) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitTextIntoChunks(text: string, preferredSize = 42): string[] {
  if (!text) {
    return [];
  }

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let end = Math.min(text.length, cursor + preferredSize);
    if (end < text.length) {
      const breakCandidates = ['\n', '。', '；', '，', '：', ' '];
      let matchedEnd = -1;

      for (const candidate of breakCandidates) {
        const candidateIndex = text.lastIndexOf(candidate, end - 1);
        if (candidateIndex > cursor + Math.floor(preferredSize / 2) && candidateIndex + 1 > matchedEnd) {
          matchedEnd = candidateIndex + 1;
        }
      }

      if (matchedEnd !== -1) {
        end = matchedEnd;
      }
    }

    chunks.push(text.slice(cursor, end));
    cursor = end;
  }

  return chunks;
}

function formatMonthDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}${day}`;
}

function formatChineseDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
}

function getPreviousWorkweekRange(baseDate = new Date()): {
  monday: Date;
  friday: Date;
  label: string;
  detailedLabel: string;
} {
  const currentDay = baseDate.getDay();
  const normalizedDay = currentDay === 0 ? 7 : currentDay;
  const monday = new Date(baseDate);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(baseDate.getDate() - normalizedDay - 6);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    monday,
    friday,
    label: `${formatMonthDay(monday)}-${formatMonthDay(friday)}`,
    detailedLabel: `${formatChineseDate(monday)} - ${formatChineseDate(friday)}`,
  };
}

async function streamChunkedContent(
  res: any,
  text: string,
  options?: { chunkSize?: number; delayMs?: number }
) {
  const chunkSize = options?.chunkSize ?? 42;
  const delayMs = options?.delayMs ?? 120;
  let accumulated = '';

  for (const chunk of splitTextIntoChunks(text, chunkSize)) {
    accumulated += chunk;
    writeSseEvent(res, 'chunk', {
      delta: chunk,
      accumulated,
    });
    await sleep(delayMs);
  }

  return accumulated;
}

async function streamWorkflowMessageContent(
  res: any,
  {
    id,
    title,
    text,
    chunkSize = 40,
    delayMs = 110,
  }: {
    id: string;
    title: string;
    text: string;
    chunkSize?: number;
    delayMs?: number;
  }
) {
  let accumulated = '';

  for (const chunk of splitTextIntoChunks(text, chunkSize)) {
    accumulated += chunk;
    writeSseEvent(res, 'workflow_message', {
      id,
      title,
      content: accumulated,
    });
    await sleep(delayMs);
  }

  return accumulated;
}

async function emitBuiltinWorkflowMessages(
  res: any,
  messages: Array<{ id: string; title: string; content: string; delayMs?: number }>
) {
  for (const message of messages) {
    writeSseEvent(res, 'workflow_message', {
      id: message.id,
      title: message.title,
      content: message.content,
    });
    await sleep(message.delayMs ?? 1400);
  }
}

function buildProductWeeklyReport(query: string): string {
  const topic = query.trim() || '根据本周公共知识库内容自动生成周报';
  const cycle = getPreviousWorkweekRange();

  return `# 产品周报（${cycle.label}）

> 周报周期：${cycle.detailedLabel}
> 生成主题：${topic}

## 一、本周状态说明
本周整理范围覆盖 ${cycle.detailedLabel} 周期内的产品、项目与非功能进展。当前周报中的任务状态采用三类口径：

1. “open”：正在进行，需持续跟进。
2. “close”：已完成，可从后续重点跟踪中移出。
3. “hold”：暂时挂起，待条件满足后恢复推进。

## 二、TODO 跟进

### 1. 知识库权限模块推进
状态：open
负责人：若楠 / 杨欢
本周进展：
- ${formatMonthDay(cycle.friday)}：已完成权限点范围梳理，待下周正式评审与研发逐项确认实现边界。
- ${formatMonthDay(new Date(cycle.monday.getTime() + 2 * 24 * 60 * 60 * 1000))}：补充知识注入、记忆变量、文档检索等权限点说明。

### 2. 服务监控（调用监控）能力补齐
状态：open
负责人：家晟
本周进展：
- ${formatMonthDay(cycle.friday)}：完成核心埋点梳理和字段定义，联调计划已排入下周。
- ${formatMonthDay(new Date(cycle.monday.getTime() + 1 * 24 * 60 * 60 * 1000))}：确认第一阶段展示指标，包括调用次数、成功率、平均耗时和报错明细。

### 3. 生物医学智能体全流程体验优化
状态：close
负责人：李垚 / 洁欣
本周进展：
- ${formatMonthDay(new Date(cycle.monday.getTime() + 3 * 24 * 60 * 60 * 1000))}：完成当前阶段流程串联和基础体验验证，后续转入体验细化。

### 4. 审计操作范围确认
状态：hold
负责人：ALL
本周进展：
- ${formatMonthDay(cycle.friday)}：已整理审计候选项清单，待管理后台能力边界明确后恢复推进。

## 三、产品进展

### 3.1 本体相关

本体接入
负责人：若楠 / 杨欢
进展：
- 完成自主规划部分需求设计调整，并完成需求评审。
- UE 已进入第一部分页面细化，正在补充配置入口与流程说明。

智能体 Demo 搭建
负责人：若楠 / 杨欢
进展：
- ${formatMonthDay(cycle.friday)}：本周以稳定现有演示链路为主，无新增功能合入。
- 当前已完成三个子智能体 Demo 搭建，验证自主规划 + 知识库替代本体的可行性。
- 与国防应用方向初步对齐第四个智能体搭建思路，后续继续补齐剩余场景。

### 3.2 Base 融合

权限融合
负责人：家晟 / 杨欢
进展：
- 基础权限部分已完成初步 PRD 编写，准备进入正式评审。
- Base 与数据产线的融合方案已形成第一版框架，计划下周继续与数据组确认可行性。

日志管理-审计日志
负责人：家晟
进展：
- 审计 PRD 已补充评审意见，当前待相关同学确认评论项后继续收敛。

流程管理
负责人：家晟
进展：
- 租户后台部分 PRD 完成度约 80%，管理后台部分完成度约 60%，整体仍按节奏推进。

消息配置
负责人：家晟
进展：
- 本周暂无新进展，预计在权限设计进一步明确后继续推进。

## 四、重点项目交付清单 / 自查

中海油：结束节点、澄清节点、工作流溯源、数据查询节点
负责人：杨欢
本周进展：
- ${formatMonthDay(cycle.friday)}：已启动 1.2.0 迭代会，目标在 4 月上旬完成上线准备。
- 本周重点完成工作流改造范围确认，并继续推进前后端对齐。
风险：
- 溯源展示与复杂参数渲染耦合度较高，仍需持续关注联调复杂度。

中海油：知识注入
负责人：若楠
本周进展：
- ${formatMonthDay(cycle.friday)}：按 V1.1.5 节奏推进，预计月底完成提测。
- 本周完成与后端、算法同学的接口细节复核。
风险：
- 算子交付节奏略慢于原计划，需持续跟踪。

河北建投：MaxToken 等模型参数
负责人：若楠
本周进展：
- ${formatMonthDay(cycle.friday)}：开发推进中，当前已完成需求补充和二次评审结论同步。
风险：
- 需要和模型选择器体验一起收口，避免前端交互复杂度上升。

河北建投：插件管理
负责人：杨欢
本周进展：
- ${formatMonthDay(cycle.friday)}：已完成 case 评审，进入测试准备阶段。
风险：
- 若测试资源不足，仍可能影响最终提测时间。

中汽研：对话历史二期
负责人：若楠
本周进展：
- ${formatMonthDay(cycle.friday)}：计划跟随 V1.1.4 上线，当前继续跟进联调排期。
风险：
- 与历史会话数据结构兼容性需要重点验证。

中汽研：计量计费对接
负责人：李垚
本周进展：
- ${formatMonthDay(cycle.friday)}：研发一期方案已确认，优先覆盖 API 调用渠道的核心监控指标。
风险：
- Token 相关指标仍存在统计口径问题，本期暂缓处理。

## 五、项目进展

中经社
负责人：邸若楠
本周进展：
- 持续与客户沟通设计文档评审后的遗留事项，当前聚焦 RAG 量级确认、接口接入范围以及前端执行过程展示。
- 同时推进可作为初验参考的评测集准备。
风险同步：
- 评测集解释权仍归客户所有，需持续对齐验收口径。

中海油
负责人：李垚 / 杨欢
本周进展：
- 推进非结构化数据元数据抽取验证。
- 推进意图识别（实体抽取）部分算法 / 规则开发。
- 补充工作流场景下的数据查询节点与结果呈现方式。
风险同步：
- 节点能力与前端呈现联动较多，联调成本偏高。

昆动所
负责人：李垚
本周进展：
- 本周已完成汇报，销售侧继续与客户沟通验收相关事项。
- 客户当前倾向以试运行版本效果为验收基准。
风险同步：
- 两周内需要进一步打通 AF 生成与定开前端的全流程。

xz4jd
负责人：李垚
本周进展：
- 本周已和客户对齐前台内容（四个模块 + 首页），前端开发进度约 50%。
- 周五评审目前已完成内容，待后端介入。
风险同步：
- 后端介入时间将直接影响整体排期。

## 六、非功能情况

数据处理
- 已完成英文、中文数据集的数据加载、过滤清洗、裁剪与输出格式整理。
- 数据处理链路已具备稳定复现基础。

检索评测
- 已完成切片效果评测，报告待整理。
- 当前语义分割策略表现最佳，ByDelimiter 在稳定性和性能之间较平衡。

指标输出
- 已整理 MRR、NDCG、Precision、Recall、HitRate、MAP 等指标口径。
- 后续可用于对比不同切片策略对检索精度、召回率与排序质量的影响。

## 七、风险同步

1. 评审排期紧张：多项目并行下，PRD 评审与测试资源仍是当前节奏的主要影响因素，需要继续按周同步排期。
2. 数据源口径不统一：市场研究、经营分析类场景后续若接入真实数据源，需要统一时间口径和引用规范。
3. 联调复杂度提升：权限、监控、溯源、复杂参数等能力存在跨模块联动，建议在需求评审后补充专项联调清单。

## 八、下周计划

1. 完成权限融合、服务监控等关键需求的正式评审与排期确认，锁定版本边界和研发计划。
2. 继续补充周报、研究报告、经营分析等高频材料的标准结构，沉淀更稳定的模板资产。
3. 跟进重点项目的联调和提测节奏，确保风险项及时暴露并形成闭环。`;
}

function buildMarketResearchProcessLog(query: string): string {
  const topic = query.trim() || 'AI4S行业研究报告';
  return `# ${topic}任务执行中

- 正在调用 Web Search 插件检索 AI4S 领域的行业定义、市场规模与政策动态
- 正在调用 Academic Search 插件检索 AI for Science 代表论文、关键技术路线与高校实验室动向
- 正在调用 Patent Insight 插件检索头部企业专利布局、重点赛道与壁垒分布
- 正在调用 Knowledge Graph 插件梳理“科研机构-平台厂商-行业客户”关系图谱
- 正在调用 Trend Summary 插件整合投融资热度、典型场景与商业化节奏
- 正在汇总检索结果并生成章节结构`;
}

function buildMarketResearchReport(query: string): string {
  const topic = query.trim() || 'AI4S行业研究报告';
  return `# ${topic}

## 一、行业定义
AI4S（AI for Science）是以人工智能方法加速科学研究发现与工程求解的新型交叉赛道，核心价值在于缩短实验周期、降低试错成本，并提升复杂系统建模效率。

## 二、驱动因素
1. 算力、模型和科研数据基础设施持续成熟，支撑跨模态科学建模。
2. 生物医药、新材料、能源化工等行业对“降本增效+提速创新”的诉求明确。
3. 政策与产业基金开始关注科学智能平台、科研算力与行业数据资产建设。

## 三、竞争格局
当前市场大致分为三类参与者：一类是提供基础模型与算力平台的通用厂商；一类是聚焦药物研发、材料发现、分子模拟等垂直场景的行业方案商；另一类是高校、科研院所与企业共建的联合创新平台。短期看，平台能力和场景数据壁垒将决定头部玩家优势。

## 四、重点应用方向
- 生物医药：用于靶点发现、分子筛选和临床前研究提速。
- 新材料：用于材料配方搜索、性质预测和工艺优化。
- 能源化工：用于催化剂设计、反应机理分析与工厂优化控制。

## 五、机会判断
未来 1 到 2 年，AI4S 更适合从“高价值、可验证、数据相对成体系”的细分场景切入。对企业客户而言，优先落地科研知识管理、实验流程辅助和小范围模型验证，比一步到位追求全流程自治更现实。

## 六、产业链分析

### 6.1 上游能力
上游主要包括算力基础设施提供商、科学计算平台、数据治理服务商以及通用大模型厂商。上游能力决定了 AI4S 落地的上限，尤其是在多模态科学数据处理、超大规模训练与复杂推理任务方面，基础设施成熟度直接影响场景扩展速度。

### 6.2 中游平台
中游是 AI4S 的核心创新层，包含科研智能平台、分子设计与模拟平台、材料发现平台、实验自动化编排平台等。这一层的竞争重点在于行业 know-how、数据闭环能力和是否能够形成可持续迭代的模型评测体系。

### 6.3 下游行业
下游主要集中在生物医药、新材料、能源化工、半导体、先进制造等行业。下游客户通常更加关注投入产出比，核心问题不是“是否能用 AI”，而是“是否能在具体研发环节显著缩短周期并提升成功率”。

## 七、商业化路径
当前 AI4S 的商业化主要分为三类路径。第一类是平台订阅模式，向科研机构和企业提供统一的建模、实验管理与结果分析能力；第二类是项目制交付，聚焦单一垂直场景输出定制模型与解决方案；第三类是联合研发模式，与头部客户共建数据资产、模型能力和验证体系。短期内，项目制与联合研发模式更容易形成收入，中长期平台化能力会决定规模上限。

## 八、落地难点
1. 高质量科研数据获取成本高，且数据标准不统一，导致跨机构复用难。
2. 科学问题往往具有强专业壁垒，模型能力必须与领域专家深度协同。
3. 很多场景需要实验验证闭环，单纯的模型输出不足以支撑商业决策。
4. 客户采购流程更审慎，尤其在医药、能源等行业，验证周期长于通用 AI 场景。

## 九、典型机会赛道

### 9.1 药物发现
AI4S 在药物靶点发现、先导化合物筛选和分子性质预测等环节具备显著价值。该赛道的特点是需求真实、价值密度高，但行业门槛也最高，需要算法团队与生物实验体系深度配合。

### 9.2 材料研发
新材料研发场景具备较强的结构化数据基础，适合通过模型快速缩小候选空间，加速配方优化和性能预测，是 AI4S 相对容易形成示范案例的方向。

### 9.3 能源化工
在催化剂设计、流程模拟、反应优化和设备运行分析等场景，AI4S 能够帮助企业降低试验成本，并提升复杂工业系统的分析效率，但前提是打通工艺数据与业务专家经验。

## 十、企业进入建议
1. 优先切入高价值、可验证、数据基础相对完善的垂直场景，避免一开始追求“大而全”平台。
2. 先把数据标准、评测指标和交付闭环建立起来，再逐步扩大模型覆盖范围。
3. 对外商业化时，建议把“平台能力”与“行业解决方案”分层包装，既展示技术上限，也降低客户理解门槛。
4. 在组织能力建设上，需要同步投入算法、行业专家、产品和交付团队，而不仅仅是模型研发。

## 十一、结论
AI4S 不是单一产品机会，而是一类围绕科研与工程创新效率重构的长期赛道。未来真正能跑出来的团队，往往既具备技术能力，又能沉淀行业数据、理解场景流程，并把模型能力嵌入到客户真实工作流中。对于希望布局该领域的企业，当前阶段更适合围绕重点行业建立样板项目，在验证价值后逐步扩展为平台型能力。`;
}

function buildBidDocumentReport(query: string): string {
  const topic = query.trim() || '智慧园区视频监控系统建设项目';
  return `# 招标文件技术规范书

> 项目主题：${topic}

## 一、项目概述
本项目拟建设覆盖园区重点出入口、公共区域、停车场与核心机房的视频监控系统，实现统一接入、集中管理、智能告警和录像留存，满足园区安全管理和运维联动要求。

## 二、招标范围
- 前端摄像机、球机、补光设备及配套支架辅材。
- 视频接入网、存储系统、管理平台与告警联动模块。
- 安装部署、系统调试、试运行培训与验收交付。

## 三、技术要求
### 1. 前端采集
- 重点点位设备分辨率不低于 400 万像素，支持低照度与宽动态。
- 关键区域支持智能识别，包括越界、入侵、人员聚集等基础能力。

### 2. 平台能力
- 支持分级账号权限、设备分组管理、录像检索与事件回溯。
- 支持与现有门禁、广播或告警系统进行标准接口对接。

### 3. 存储与安全
- 录像留存周期原则上不少于 90 天，核心区域支持更长周期扩展。
- 平台应具备日志审计、权限隔离和关键配置备份恢复能力。

## 四、实施与验收要求
- 中标方应提交实施计划、点位清单、网络拓扑与培训方案。
- 项目验收应包括功能验收、性能验收、联调验收和文档验收。
- 交付文档至少包含设备台账、操作手册、维护手册和培训记录。

## 五、投标响应要点
投标文件应明确项目经理、实施团队、交付周期、售后响应机制，以及对关键条款逐项响应，不得出现模糊表述或选择性应答。

## 六、商务与服务要求

### 6.1 服务周期
- 项目整体实施周期应与招标人计划保持一致，并在中标后提交分阶段实施计划。
- 中标方需明确关键里程碑，包括设备到货、安装部署、联调测试、试运行和最终验收。

### 6.2 售后与运维
- 应提供不少于 1 年的质保及运维支持服务。
- 应明确故障响应时效、远程支持机制、现场服务机制和备品备件保障方案。
- 对关键系统需提供节假日和重要时段的保障预案。

### 6.3 培训与交接
- 中标方需面向管理员、运维人员和一线使用人员分别提供培训。
- 培训内容应覆盖系统使用、常见故障处理、权限管理、日志查询和应急处置。
- 培训结束后需提交培训记录、签到材料和培训课件。

## 七、投标人资质建议
1. 具有类似安防、视频监控或智慧园区类项目交付经验。
2. 具备软硬件集成、网络部署和平台对接能力。
3. 拥有稳定的实施团队及明确的项目经理、技术负责人配置。
4. 对信息安全、日志审计和数据留存要求具有成熟交付经验。

## 八、评审关注点

### 8.1 技术评审
- 技术方案是否完整覆盖招标范围。
- 关键性能指标是否满足或优于招标要求。
- 平台兼容性、扩展性和可运维性是否充分说明。

### 8.2 商务评审
- 项目组织与实施计划是否可执行。
- 售后服务承诺是否明确，服务资源是否可落地。
- 报价结构是否清晰，是否存在明显漏项或不平衡报价风险。

### 8.3 风险评审
- 是否充分识别现场施工、网络接入、系统兼容等风险。
- 是否提供针对工期、设备到货、接口联调的应急预案。

## 九、建议的交付文档清单

| 类别 | 文档名称 | 说明 |
| --- | --- | --- |
| 实施文档 | 实施计划、施工方案、点位清单 | 用于指导项目建设与资源协调 |
| 技术文档 | 网络拓扑图、系统架构说明、接口说明 | 用于技术交底与后续运维 |
| 运维文档 | 运维手册、故障处理手册、巡检模板 | 用于项目上线后的稳定运行 |
| 验收文档 | 测试报告、试运行报告、验收记录 | 用于形成完整交付闭环 |

## 十、结语
本技术规范书旨在明确项目建设目标、交付范围、技术边界和验收要求，为后续招标、投标、实施和验收提供统一依据。建议在正式发布前，结合招标人现网环境、预算边界及现有系统接口情况，再做一次条款核对与细节校准。`;
}

function buildBusinessReport(query: string): string {
  const topic = query.trim() || '2026年2月经营分析报告';
  return `# ${topic}

## 一、经营概览
本月整体经营表现保持平稳，收入端延续增长趋势，重点客户续签情况较好，但新项目转化周期仍偏长。毛利率较上月小幅承压，主要受交付资源投入前置与部分低毛利项目占比提升影响。

## 二、核心指标观察
- 收入：延续增长，但结构上仍依赖头部客户与存量项目增购。
- 回款：节奏总体可控，个别项目存在审批链条较长导致的回款延后。
- 毛利：服务型项目投入增加，阶段性摊薄整体利润水平。
- 新签：商机储备充足，但从立项到签约仍需更强的销售协同。

## 三、问题诊断
1. 经营增长更多来自已签客户的深挖，新增客户拓展效率有待提升。
2. 部分项目在需求变更阶段缺少边界控制，影响交付成本和利润兑现。
3. 数据口径仍分散在销售、交付与财务多端，分析结论的统一性需要加强。

## 四、改进建议
- 建立重点商机周度跟进机制，缩短从线索到签约的推进周期。
- 对低毛利项目设置专项复盘，明确报价、范围管理和资源投入基线。
- 建立统一经营看板，按收入、回款、成本、项目风险四类维度持续跟踪。

## 五、下月关注重点
下月建议重点关注重点客户续签、回款节点兑现情况，以及高投入项目的交付质量和毛利修复节奏，确保增长与质量同步。

## 六、收入结构分析
从收入结构看，本月主要增长仍由重点客户续签和存量项目增购带动，说明现有客户经营基础较稳，但新增客户的贡献仍有限。若后续不能提升新签效率，收入增长将继续依赖少数重点客户，结构性风险仍需关注。

## 七、成本与利润分析
1. 服务型项目的人力投入前置，导致阶段性成本抬升。
2. 部分项目在需求变更过程中边界控制不足，增加了交付消耗。
3. 低毛利项目占比提升，对整体利润率形成拖累。

从趋势看，当前利润承压并非单一项目导致，而是项目结构、资源投入和报价策略共同作用的结果。后续若要改善利润表现，需要同步治理项目准入、资源分配和交付边界。

## 八、项目经营风险

### 8.1 回款风险
个别项目仍存在审批链路较长、客户付款节点不稳定等情况，短期内会对现金流形成一定压力。建议对重点项目建立回款预警清单，并按周跟踪。

### 8.2 交付风险
高投入项目的需求变更频次偏高，若缺少明确的变更控制机制，可能继续挤压项目毛利空间。建议加强项目经理和销售、交付之间的协同机制。

### 8.3 商机转化风险
当前商机储备数量并不少，但从线索到签约的推进效率偏低，说明售前支持、方案匹配和决策链跟踪仍存在优化空间。

## 九、管理动作建议
1. 建立重点商机分层跟进机制，对高价值项目实行周度复盘。
2. 对低毛利项目设立专项复盘，明确是报价问题、范围问题还是交付效率问题。
3. 统一销售、交付、财务三端数据口径，形成管理层可直接使用的经营看板。
4. 在新项目立项阶段增加经营评审环节，对高风险项目提前识别与干预。

## 十、经营判断
整体来看，当前经营态势仍处于“收入平稳增长、利润阶段承压、结构需要优化”的状态。短期重点应放在回款保障、项目毛利修复和新签效率提升三件事上；中期则需要通过统一数据口径和强化经营复盘机制，逐步形成更加健康的增长结构。

## 十一、下阶段重点推进事项

| 序号 | 事项 | 目标 |
| --- | --- | --- |
| 1 | 重点客户续签推进 | 确保核心收入盘稳定 |
| 2 | 回款节点专项跟踪 | 降低现金流压力 |
| 3 | 低毛利项目复盘 | 修复利润表现 |
| 4 | 商机转化效率提升 | 增强新增收入来源 |

## 十二、结论
本月经营表现总体可控，但增长质量仍有改进空间。下一阶段应更加重视收入结构优化、项目毛利治理和经营节奏管理，在保持规模增长的同时，逐步提升经营质量与抗风险能力。`;
}

async function streamBuiltinAgentResponse({
  res,
  scenarioId,
  query,
}: {
  res: any;
  scenarioId: string;
  query: string;
}) {
  openSseStream(res);

  if (scenarioId === 'product-weekly') {
    const report = buildProductWeeklyReport(query);
    const cycle = getPreviousWorkweekRange();
    await emitBuiltinWorkflowMessages(res, [
      {
        id: `product-weekly-fetch-${Date.now()}`,
        title: '执行进度',
        content: '正在确认当前周报周期',
        delayMs: 1800,
      },
      {
        id: `product-weekly-merge-${Date.now()}`,
        title: '执行进度',
        content: `正在根据周期（${cycle.label}）检索相关文档`,
        delayMs: 2200,
      },
    ]);
    await sleep(900);
    await streamChunkedContent(res, report, {
      chunkSize: 22,
      delayMs: 260,
    });
    writeSseEvent(res, 'done', { result: report });
    res.end();
    return;
  }

  if (scenarioId === 'market-research') {
    const processLog = buildMarketResearchProcessLog(query);
    const report = buildMarketResearchReport(query);

    await streamWorkflowMessageContent(res, {
      id: 'market-research-tools',
      title: '工具调用',
      text: processLog,
      chunkSize: 22,
      delayMs: 240,
    });

    await sleep(1500);

    await emitBuiltinWorkflowMessages(res, [
      {
        id: `market-research-summary-${Date.now()}`,
        title: '执行进度',
        content: '已完成检索结果整理，正在生成研究报告正文',
        delayMs: 1800,
      },
    ]);

    await sleep(900);
    await streamChunkedContent(res, report, {
      chunkSize: 20,
      delayMs: 260,
    });
    writeSseEvent(res, 'done', { result: report });
    res.end();
    return;
  }

  if (scenarioId === 'bid-document') {
    const report = buildBidDocumentReport(query);
    await emitBuiltinWorkflowMessages(res, [
      {
        id: `bid-document-scope-${Date.now()}`,
        title: '执行进度',
        content: '正在解析招标范围与交付边界',
        delayMs: 1700,
      },
      {
        id: `bid-document-template-${Date.now()}`,
        title: '执行进度',
        content: '正在匹配招标模板与技术规范章节',
        delayMs: 2000,
      },
      {
        id: `bid-document-check-${Date.now()}`,
        title: '执行进度',
        content: '正在校验资格条款、评分项与交付要求',
        delayMs: 2200,
      },
    ]);
    await sleep(900);
    await streamChunkedContent(res, report, {
      chunkSize: 22,
      delayMs: 250,
    });
    writeSseEvent(res, 'done', { result: report });
    res.end();
    return;
  }

  if (scenarioId === 'business-report') {
    const report = buildBusinessReport(query);
    await emitBuiltinWorkflowMessages(res, [
      {
        id: `business-report-metrics-${Date.now()}`,
        title: '执行进度',
        content: '正在汇总收入、回款、毛利与项目交付等经营指标',
        delayMs: 1800,
      },
      {
        id: `business-report-diagnosis-${Date.now()}`,
        title: '执行进度',
        content: '正在识别经营波动原因并生成经营诊断',
        delayMs: 2100,
      },
      {
        id: `business-report-actions-${Date.now()}`,
        title: '执行进度',
        content: '正在输出经营改进建议与下月关注重点',
        delayMs: 2200,
      },
    ]);
    await sleep(900);
    await streamChunkedContent(res, report, {
      chunkSize: 22,
      delayMs: 250,
    });
    writeSseEvent(res, 'done', { result: report });
    res.end();
    return;
  }

  writeSseEvent(res, 'error', { error: `未配置场景 ${scenarioId} 的内置流程` });
  res.end();
}

async function generateFallbackAgentResult({
  scenarioId,
  query,
  inputs,
}: {
  scenarioId: string;
  query: string;
  inputs?: Record<string, unknown>;
}): Promise<string> {
  const apiKey = process.env.QWEN_API_KEY?.trim();
  if (!apiKey) {
    return '';
  }

  const baseUrl = process.env.QWEN_BASE_URL || DEFAULT_QWEN_BASE_URL;
  const model = process.env.QWEN_MODEL || DEFAULT_QWEN_MODEL;
  const inputSummary = inputs
    ? Object.entries(inputs)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join('\n')
    : '';

  const messages = [
    {
      role: 'system',
      content:
        '你是企业写作智能体。请根据用户需求直接输出中文 Markdown 正文，不要输出解释、前后缀或代码块。',
    },
    {
      role: 'user',
      content: `当前模式：${getScenarioLabel(scenarioId)}\n用户需求：${query}${
        inputSummary ? `\n附加参数：\n${inputSummary}` : ''
      }\n\n请直接输出最终正文。`,
    },
  ];

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      return '';
    }

    const data = (await response.json()) as QwenChatResponse;
    return extractQwenContent(data);
  } catch {
    return '';
  }
}

async function sendAgentFallback({
  res,
  scenarioId,
  query,
  inputs,
  reason,
}: {
  res: any;
  scenarioId: string;
  query: string;
  inputs?: Record<string, unknown>;
  reason: string;
}) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const fallbackResult = await generateFallbackAgentResult({
    scenarioId,
    query,
    inputs,
  });

  if (fallbackResult.trim()) {
    const fallbackNotice = `真实智能体暂不可用，已切换为简化生成（原因：${reason || '上游不可达'}）。当前返回的是降级后的直接正文结果。`;
    writeSseEvent(res, 'status', {
      status: '真实智能体暂不可用，已自动切换为通用生成',
    });
    writeSseEvent(res, 'workflow_message', {
      id: `workflow-fallback-${Date.now()}`,
      title: '工作流状态',
      content: fallbackNotice.slice(0, 260),
    });
    writeSseEvent(res, 'done', { result: fallbackResult });
  } else {
    writeSseEvent(res, 'error', { error: reason });
  }

  res.end();
}

function parseSseFrame(frame: string): string | null {
  const trimmed = frame.trim();
  if (!trimmed) {
    return null;
  }

  const dataLines = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim());

  if (dataLines.length === 0) {
    return null;
  }

  return dataLines.join('\n');
}

function findSseBoundary(buffer: string): number {
  const lfIndex = buffer.indexOf('\n\n');
  const crlfIndex = buffer.indexOf('\r\n\r\n');

  if (lfIndex === -1) return crlfIndex;
  if (crlfIndex === -1) return lfIndex;
  return Math.min(lfIndex, crlfIndex);
}

function getBoundaryLength(buffer: string, index: number): number {
  return buffer.startsWith('\r\n\r\n', index) ? 4 : 2;
}

function writeSseEvent(res: any, event: string, payload: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function parseErrorMessage(rawText: string, status: number): string {
  if (!rawText.trim()) {
    return `真实智能体请求失败（${status}）`;
  }

  try {
    const parsed = JSON.parse(rawText) as { error?: string; message?: string };
    return parsed.error || parsed.message || `真实智能体请求失败（${status}）`;
  } catch {
    return rawText.trim();
  }
}

function getStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function getRecordValue(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function extractNodeOutputs(data: Record<string, unknown> | undefined): Record<string, unknown> {
  return getRecordValue(data?.outputs) || getRecordValue(data?.output) || {};
}

function normalizeNodeType(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '-');
}

function extractTextFromValue(value: unknown): string {
  const directText = getStringValue(value).trim();
  if (directText) {
    return directText;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = extractTextFromValue(item);
      if (text) {
        return text;
      }
    }
    return '';
  }

  const record = getRecordValue(value);
  if (!record) {
    return '';
  }

  for (const key of MESSAGE_OUTPUT_KEYS) {
    const text = extractTextFromValue(record[key]);
    if (text) {
      return text;
    }
  }

  for (const key of ['text', 'content', 'value', 'result', 'answer']) {
    const text = extractTextFromValue(record[key]);
    if (text) {
      return text;
    }
  }

  return '';
}

function extractPreferredOutput(
  outputs: Record<string, unknown> | undefined,
  preferredKeys: string[]
): string {
  if (!outputs) {
    return '';
  }

  for (const key of preferredKeys) {
    const value = extractTextFromValue(outputs[key]);
    if (value.trim()) {
      return value;
    }
  }

  for (const value of Object.values(outputs)) {
    const text = extractTextFromValue(value);
    if (text.trim()) {
      return text;
    }
  }

  return '';
}

async function streamWorkflowAgentResponse({
  res,
  response,
}: {
  res: any;
  response: Response;
}) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('真实智能体流式响应不可读');
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult = '';
  let hasWorkflowFinished = false;
  const emittedWorkflowMessages = new Set<string>();

  const cacheFinalResult = (nextResult: string) => {
    if (nextResult.trim()) {
      finalResult = nextResult;
    }
  };

  const emitWorkflowMessage = (data: Record<string, unknown> | undefined) => {
    const outputs = extractNodeOutputs(data);
    const content = extractPreferredOutput(outputs, MESSAGE_OUTPUT_KEYS).trim();
    if (!content) {
      return;
    }

    const messageId =
      getStringValue(data?.id) ||
      getStringValue(data?.node_id) ||
      `${getStringValue(data?.title)}:${content}`;

    if (emittedWorkflowMessages.has(messageId)) {
      return;
    }

    emittedWorkflowMessages.add(messageId);
    writeSseEvent(res, 'workflow_message', {
      id: messageId,
      title: getStringValue(data?.title) || '消息节点',
      content,
    });
  };

  const consumeEnvelope = (envelope: AppforgeEventEnvelope) => {
    const eventName = envelope.event || '';
    const data = getRecordValue(envelope.data);

    if (!eventName) {
      return;
    }

    if (eventName === 'node_started') {
      const nodeType = getStringValue(data?.node_type);
      const nodeTitle = getStringValue(data?.title);
      if (nodeTitle && nodeType !== 'msg-output') {
        writeSseEvent(res, 'status', {
          status: `正在执行：${nodeTitle}`,
          nodeTitle,
          nodeType,
        });
      }
      return;
    }

    if (eventName === 'node_finished' || eventName === 'node_completed') {
      const nodeType = normalizeNodeType(getStringValue(data?.node_type));

      if (MESSAGE_NODE_TYPES.has(nodeType)) {
        emitWorkflowMessage(data);
        return;
      }

      if (nodeType === 'end') {
        const outputs = extractNodeOutputs(data);
        cacheFinalResult(extractPreferredOutput(outputs, FINAL_OUTPUT_KEYS));
      }
      return;
    }

    if (eventName === 'workflow_finished' || eventName === 'workflow_completed') {
      hasWorkflowFinished = true;
      const outputs = extractNodeOutputs(data);
      cacheFinalResult(extractPreferredOutput(outputs, FINAL_OUTPUT_KEYS));
      writeSseEvent(res, 'done', {
        result: finalResult,
      });
      res.end();
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let boundaryIndex = findSseBoundary(buffer);
    while (boundaryIndex !== -1) {
      const frame = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + getBoundaryLength(buffer, boundaryIndex));

      const payload = parseSseFrame(frame);
      if (payload) {
        try {
          consumeEnvelope(JSON.parse(payload) as AppforgeEventEnvelope);
        } catch {
          // Ignore invalid upstream frames.
        }
      }

      boundaryIndex = findSseBoundary(buffer);
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    const payload = parseSseFrame(buffer);
    if (payload) {
      try {
        consumeEnvelope(JSON.parse(payload) as AppforgeEventEnvelope);
      } catch {
        // Ignore invalid upstream frames.
      }
    }
  }

  if (!hasWorkflowFinished) {
    writeSseEvent(res, 'done', {
      result: finalResult,
    });
    res.end();
  }
}

async function streamContentAgentResponse({
  res,
  response,
}: {
  res: any;
  response: Response;
}) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('真实智能体流式响应不可读');
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult = '';
  let hasFinished = false;

  const consumeEnvelope = (envelope: AppforgeContentEnvelope) => {
    const type = getStringValue(envelope.type).trim().toLowerCase();

    if (type === 'answer') {
      const content = typeof envelope.content === 'string' ? envelope.content : '';
      if (!content) {
        return;
      }

      finalResult += content;
      writeSseEvent(res, 'chunk', {
        delta: content,
        accumulated: finalResult,
      });
      return;
    }

    if (type === 'done') {
      hasFinished = true;
      writeSseEvent(res, 'done', {
        result: finalResult,
      });
      res.end();
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let boundaryIndex = findSseBoundary(buffer);
    while (boundaryIndex !== -1) {
      const frame = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + getBoundaryLength(buffer, boundaryIndex));

      const payload = parseSseFrame(frame);
      if (payload) {
        try {
          consumeEnvelope(JSON.parse(payload) as AppforgeContentEnvelope);
        } catch {
          // Ignore invalid upstream frames.
        }
      }

      boundaryIndex = findSseBoundary(buffer);
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    const payload = parseSseFrame(buffer);
    if (payload) {
      try {
        consumeEnvelope(JSON.parse(payload) as AppforgeContentEnvelope);
      } catch {
        // Ignore invalid upstream frames.
      }
    }
  }

  if (!hasFinished) {
    writeSseEvent(res, 'done', {
      result: finalResult,
    });
    res.end();
  }
}

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const body = getBody(req.body);
  const scenarioId = body.scenarioId?.trim() || '';
  const query = body.query?.trim() || '';
  const shouldStream = body.stream !== false;
  const inputs = getInputs(body.inputs);

  if (!scenarioId) {
    res.status(400).json({ error: 'scenarioId 不能为空' });
    return;
  }

  if (!query) {
    res.status(400).json({ error: 'query 不能为空' });
    return;
  }

  const agent = AGENT_REGISTRY[scenarioId];

  if (!shouldStream) {
    res.status(400).json({ error: '当前仅支持流式调用真实智能体' });
    return;
  }

  if (BUILTIN_SCENARIO_IDS.has(scenarioId)) {
    await streamBuiltinAgentResponse({
      res,
      scenarioId,
      query,
    });
    return;
  }

  if (!agent) {
    res.status(400).json({ error: `未配置场景 ${scenarioId} 的真实接口` });
    return;
  }

  try {
    const response = await fetch(`${APPFORGE_BASE_URL}/InvokeApp/${agent.appId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${agent.token}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/json, */*',
      },
      body: JSON.stringify({
        id: agent.appId,
        query,
        ...(inputs ? { inputs } : {}),
      }),
    });

    if (!response.ok) {
      const rawText = await response.text();
      const errorMessage = parseErrorMessage(rawText, response.status);
      await sendAgentFallback({
        res,
        scenarioId,
        query,
        inputs,
        reason: errorMessage,
      });
      return;
    }

    if (agent.agentType === 'content-stream') {
      await streamContentAgentResponse({ res, response });
      return;
    }

    if (agent.agentType === 'workflow') {
      await streamWorkflowAgentResponse({ res, response });
      return;
    }

    res.status(400).json({ error: `暂不支持 ${agent.agentType} 类型真实智能体` });
  } catch (error) {
    const message = error instanceof Error ? error.message : '真实智能体调用失败';
    await sendAgentFallback({
      res,
      scenarioId,
      query,
      inputs,
      reason: message,
    });
  }
}
