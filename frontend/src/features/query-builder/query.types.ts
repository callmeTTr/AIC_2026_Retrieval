export type VisualSearchModel =
  | "bge"
  | "metaclip"
  | "beit3"
  | "perception";
export type SearchMode =
  | "standard"
  | "trake";
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
  searchMode: SearchMode;
  scenes: QueryScene[];
  topKPerModality: number;
  displayResultCount: number;
  useQueryRewrite: boolean;
  selectedVisualModels: VisualSearchModel[];
}
