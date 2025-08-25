import express from 'express';
import { Octokit } from '@octokit/rest';
import { verifyToken } from './github';

export const lessonPlansRouter = express.Router();

// Lesson plan folder path
const LESSON_PLANS_FOLDER = '_lesson-plans';

/**
 * Get all lesson plans from the repository
 */
lessonPlansRouter.get('/', verifyToken, async (req, res) => {
  try {
    const { owner, repo, branch } = req.query;
    
    if (!owner || !repo) {
      return res.status(400).json({ error: 'Owner and repo parameters are required' });
    }
    
    const octokit = new Octokit({ auth: req.body.token });
    
    // Get the contents of the _lesson-plans folder
    const response = await octokit.repos.getContent({
      owner: owner as string,
      repo: repo as string,
      path: LESSON_PLANS_FOLDER,
      ref: branch as string || undefined
    });

    if (!Array.isArray(response.data)) {
      return res.status(400).json({ error: 'Expected a directory, got a file' });
    }

    // This will store all our lesson plans
    const lessonPlans = [];
    
    // Process each category folder
    for (const item of response.data) {
      if (item.type === 'dir') {
        // This is a category folder
        const categoryInfo = await getCategoryInfo(octokit, owner as string, repo as string, item.path, branch as string);
        
        // Get the contents of the topics folder within this category
        const topicsPath = `${item.path}/topics`;
        try {
          const topicsResponse = await octokit.repos.getContent({
            owner: owner as string,
            repo: repo as string,
            path: topicsPath,
            ref: branch as string || undefined
          });
          
          if (Array.isArray(topicsResponse.data)) {
            // Process each lesson plan in the topics folder
            for (const topicFile of topicsResponse.data) {
              if (topicFile.type === 'file' && topicFile.name.endsWith('.md')) {
                lessonPlans.push({
                  name: topicFile.name,
                  path: topicFile.path,
                  sha: topicFile.sha,
                  content: topicFile.content || null,
                  decoded_content: topicFile.content ? Buffer.from(topicFile.content, 'base64').toString('utf-8') : null,
                  html_url: topicFile.html_url || '',
                  category: categoryInfo
                });
              }
            }
          }
        } catch (error) {
          console.warn(`Topics folder not found in ${item.path} or error accessing it:`, error);
          // Continue with other categories even if one fails
        }
      } else if (item.type === 'file' && item.name.endsWith('.md') && item.name !== 'index.md') {
        // Also include any markdown files directly in the _lesson-plans folder (except index.md)
        lessonPlans.push({
          name: item.name,
          path: item.path,
          sha: item.sha,
          content: item.content || null,
          decoded_content: item.content ? Buffer.from(item.content, 'base64').toString('utf-8') : null,
          html_url: item.html_url || ''
        });
      }
    }
    
    return res.json(lessonPlans);
  } catch (error) {
    console.error('Error fetching lesson plans:', error);
    
    // If the folder doesn't exist, return an empty array
    if ((error as any).status === 404) {
      return res.json([]);
    }
    
    return res.status(500).json({ error: 'Failed to fetch lesson plans' });
  }
});

/**
 * Get a specific lesson plan by path
 */
lessonPlansRouter.get('/file', verifyToken, async (req, res) => {
  try {
    const { owner, repo, branch, path } = req.query;
    
    if (!owner || !repo || !path) {
      return res.status(400).json({ error: 'Owner, repo, and path parameters are required' });
    }
    
    const octokit = new Octokit({ auth: req.body.token });
    
    const response = await octokit.repos.getContent({
      owner: owner as string,
      repo: repo as string,
      path: path as string,
      ref: branch as string || undefined
    });
    
    if (Array.isArray(response.data)) {
      return res.status(400).json({ error: 'Expected a file, got a directory' });
    }
    
    const file = response.data;
    // Handle the content safely with type checking
    let fileContent: string | null = null;
    if ('content' in file && typeof file.content === 'string') {
      fileContent = file.content;
    }
    
    const decodedContent = fileContent ? Buffer.from(fileContent, 'base64').toString('utf-8') : null;
    
    const lessonPlan = {
      name: file.name,
      path: file.path,
      sha: file.sha,
      content: fileContent,
      decoded_content: decodedContent,
      html_url: file.html_url || ''
    };
    
    return res.json(lessonPlan);
  } catch (error) {
    console.error('Error fetching lesson plan:', error);
    return res.status(500).json({ error: 'Failed to fetch lesson plan' });
  }
});

/**
 * Parse category information from index.md file
 */
async function getCategoryInfo(
  octokit: Octokit,
  owner: string,
  repo: string,
  categoryPath: string,
  branch?: string
): Promise<{ title: string; number: number } | undefined> {
  try {
    // Try to get the index.md file in the category folder
    const indexResponse = await octokit.repos.getContent({
      owner,
      repo,
      path: `${categoryPath}/index.md`,
      ref: branch || undefined
    });
    
    if ('content' in indexResponse.data && typeof indexResponse.data.content === 'string') {
      const content = Buffer.from(indexResponse.data.content, 'base64').toString('utf-8');
      
      // Parse the frontmatter
      const titleMatch = content.match(/title:\s*([^\n]+)/i);
      const numberMatch = content.match(/number:\s*(\d+)/i);
      
      if (titleMatch && numberMatch) {
        return {
          title: titleMatch[1].trim(),
          number: parseInt(numberMatch[1].trim(), 10)
        };
      }
    }
    
    return undefined;
  } catch (error) {
    console.warn(`No index.md found in ${categoryPath} or error parsing it:`, error);
    return undefined;
  }
}
