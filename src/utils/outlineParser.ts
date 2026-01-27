/**
 * 解析 Markdown 大纲为 3 层级结构
 */

export interface OutlineNode {
  level: number;
  title: string;
  children: OutlineNode[];
}

/**
 * 解析 Markdown 大纲文本为层级结构
 */
export function parseOutline(markdown: string): OutlineNode[] {
  const lines = markdown.split('\n');
  const root: OutlineNode[] = [];
  const stack: OutlineNode[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const title = match[2].trim();

    const node: OutlineNode = {
      level,
      title,
      children: [],
    };

    // 找到合适的父节点
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return root;
}
