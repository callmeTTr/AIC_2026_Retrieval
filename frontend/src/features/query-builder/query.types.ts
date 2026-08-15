export type VisualSearchModel =
  | "bge"
  | "metaclip"
  | "beit3"
  | "perception";

export interface QueryScene {
  id: string;
  visualQuery: string;
  ocrQuery: string;
  asrQuery: string;
}

export type QueryField =
  | "visualQuery"
  | "ocrQuery"
  | "asrQuery";

export interface QueryBuilderValue {
  scenes: QueryScene[];
  topKPerModality: number;
  displayResultCount: number;
  useQueryRewrite: boolean;
  selectedVisualModels: VisualSearchModel[];
}
