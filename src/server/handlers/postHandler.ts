import { context, reddit } from '@devvit/web/server';
import { LevelData } from '../../shared/types/level';
import { LevelHandler } from './levelHandler';

export class PostHandler {
  static async createLevelPost(levelData: LevelData): Promise<{ postId: string; success: boolean; message: string }> {
    console.log('🚀 [PostHandler] Starting createLevelPost');
    console.log('📊 [PostHandler] Level metadata:', {
      name: levelData.metadata?.name,
      author: levelData.metadata?.author,
      created: levelData.metadata?.created
    });
    
    try {
      const { subredditName } = context;
      console.log('📍 [PostHandler] Context subredditName:', subredditName);
      
      if (!subredditName) {
        throw new Error('subredditName is required');
      }

      console.log('📝 [PostHandler] Calling reddit.submitCustomPost...');
      // Create the Reddit post with level metadata
      const post = await reddit.submitCustomPost({
        splash: {
          appDisplayName: 'QuestBuddies',
          backgroundUri: 'default-splash.png',
          buttonLabel: 'Play Level',
          description: `A custom QuestBuddies level by ${levelData.metadata.author}`,
          heading: 'QuestBuddies Level',
          appIconUri: 'default-icon.png',
        },
        postData: {
          gameType: 'level',
          levelName: levelData.metadata.name,
          levelAuthor: levelData.metadata.author,
          created: levelData.metadata.created,
        },
        subredditName: subredditName,
        // Use a shorter, more readable title format for UUID-based levels
        title: `[Level] QuestBuddies Level by ${levelData.metadata.author}`,
      });

      console.log('✅ [PostHandler] Post created successfully!');
      console.log('📌 [PostHandler] Post ID:', post.id);
      console.log('🔗 [PostHandler] Post URL: https://reddit.com/r/' + subredditName + '/comments/' + post.id);

      // Save the level data to Redis using the post ID
      console.log('💾 [PostHandler] Saving level data to Redis...');
      const saveResult = await LevelHandler.saveLevelData(post.id, levelData);
      console.log('💾 [PostHandler] Redis save result:', saveResult);
      
      if (!saveResult.success) {
        console.error('❌ [PostHandler] Failed to save level data after post creation:', saveResult.message);
        return {
          postId: post.id,
          success: false,
          message: `Post created but failed to save level data: ${saveResult.message}`
        };
      }

      console.log('✅ [PostHandler] Level post created and saved successfully!');
      console.log('🎉 [PostHandler] Final result:', {
        postId: post.id,
        success: true,
        message: 'Level post created successfully'
      });

      return {
        postId: post.id,
        success: true,
        message: 'Level post created successfully'
      };
    } catch (error) {
      console.error('❌ [PostHandler] Error creating level post:', error);
      if (error instanceof Error) {
        console.error('❌ [PostHandler] Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
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