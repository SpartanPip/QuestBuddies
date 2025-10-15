export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type SaveLevelRequest = {
  levelData: import('./level').LevelData;
};

export type SaveLevelResponse = {
  type: 'save-level';
  postId: string;
  success: boolean;
  message: string;
};

export type LoadLevelResponse = {
  type: 'load-level';
  postId: string;
  levelData: import('./level').LevelData | null;
  success: boolean;
  message: string;
};
