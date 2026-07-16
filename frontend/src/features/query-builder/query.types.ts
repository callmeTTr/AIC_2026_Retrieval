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
}