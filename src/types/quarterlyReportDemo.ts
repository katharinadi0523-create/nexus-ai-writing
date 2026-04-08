export interface QuarterlyReportSelectedAnswers {
  reportingPeriod: boolean | null;
  includeMetrics: boolean | null;
}

export interface QuarterlyReportDemoState {
  currentStep: number;
  autoPlay: boolean;
  selectedAnswers: QuarterlyReportSelectedAnswers;
}
