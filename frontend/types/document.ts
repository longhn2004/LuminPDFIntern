export interface FileItem {
  id: string;
  name: string;
  owner: string;
  role: string;
  updatedAt: string;
}

export interface UploadState {
  uploading: boolean;
  progress: number;
  fileName: string;
}

export type SortOrder = 'ASC' | 'DESC'; 