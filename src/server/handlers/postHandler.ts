import { context, reddit } from '@devvit/web/server';
import { LevelData } from '../../shared/types/level';
import { LevelHandler } from './levelHandler';

export class PostHandler {
  static async createLevelPost(levelData: LevelData): Promise<{ postId: string; success: boolean; message: string }> {
    try {
      const { subredditName } = context;
      if (!subredditName) {
        throw new Error('subredditName is required');
      }

      // Create the Reddit post with level metadata
      const post = await reddit.submitCustomPost({
        splash: {
          appDisplayName: 'QuestBuddies',
          backgroundUri: 'default-splash.png',
          buttonLabel: 'Play Level',
          description: `Play "${levelData.metadata.name}" by ${levelData.metadata.author}`,
          heading: levelData.metadata.name,
          appIconUri: 'default-icon.png',
        },
        postData: {
          gameType: 'level',
          levelName: levelData.metadata.name,
          levelAuthor: levelData.metadata.author,
          created: levelData.metadata.created,
        },
        subredditName: subredditName,
        title: `[Level] ${levelData.metadata.name} by ${levelData.metadata.author}`,
      });

      // Save the level data to Redis using the post ID
      const saveResult = await LevelHandler.saveLevelData(post.id, levelData);
      
      if (!saveResult.success) {
        console.error('Failed to save level data after post creation:', saveResult.message);
        return {
          postId: post.id,
          success: false,
          message: `Post created but failed to save level data: ${saveResult.message}`
        };
      }

      return {
        postId: post.id,
        success: true,
        message: 'Level post created successfully'
      };
    } catch (error) {
      console.error('Error creating level post:', error);
      return {
        postId: '',
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create level post'
      };
    }
  }

  static async createDefaultPost(): Promise<{ postId: string; success: boolean; message: string }> {
    try {
      const { subredditName } = context;
      if (!subredditName) {
        throw new Error('subredditName is required');
      }

      const post = await reddit.submitCustomPost({
        splash: {
          appDisplayName: 'QuestBuddies',
          backgroundUri: 'default-splash.png',
          buttonLabel: 'Start Playing',
          description: 'Create and play custom levels in QuestBuddies',
          heading: 'Welcome to QuestBuddies!',
          appIconUri: 'default-icon.png',
        },
        postData: {
          gameType: 'builder',
          mode: 'create',
        },
        subredditName: subredditName,
        title: 'QuestBuddies - Level Builder',
      });

      return {
        postId: post.id,
        success: true,
        message: 'Default post created successfully'
      };
    } catch (error) {
      console.error('Error creating default post:', error);
      return {
        postId: '',
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create default post'
      };
    }
  }
}