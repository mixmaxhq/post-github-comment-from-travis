import Octokit from '@octokit/rest';
import crypto from 'crypto';
import { URL } from 'url';

// Identify/parse and construct the deduplication comment that goes at the top of the PR comment.
const rDedupeComment = /^<!-- post-github-comment-from-travis :: ((?:(?!-->).)+?) -->/m;
const getDedupeComment = (content) => `<!-- post-github-comment-from-travis :: ${content} -->`;

/**
 * Get the unique token for the comment.
 *
 * @param {string} repository The repository, in slug form.
 * @param {string|number} pullRequest The pull request number on GitHub.
 * @param {string} purpose The purpose of the comment.
 */
function getUniqueToken({ repository, pullRequest, purpose }) {
  const hash = crypto.createHash('sha256');
  hash.update('@mixmaxhq/post-github-comment-from-travis\0');
  hash.update(repository);
  hash.update('\0');
  hash.update(String(pullRequest));
  hash.update('\0');
  hash.update(purpose);
  hash.update('\0');
  return hash.digest('hex');
}

// Compatibility for Node 8.
if (Symbol.asyncIterator === undefined) {
  Symbol.asyncIterator = Symbol.for('asyncIterator');
}

/**
 * Commenter constructs an Octokit instance for use across multiple calls.
 */
export default class Commenter {
  /**
   * @param {*} auth Any authorization string or object accepted by octokit.
   */
  constructor({ auth }) {
    this.octokit = new Octokit({ auth });
  }

  /**
   * Create a comment.
   *
   * @param {string} repository The repository on which to create the comment, in slug form.
   * @param {number|string} pullRequest The pull request number on GitHub which holds the thread
   *   where the comment should be created.
   * @param {string} content The GitHub flavored markdown to put in the comment.
   * @return {Promise<Object>} An object containing details about the created comment.
   */
  async createComment({ repository, pullRequest }, content) {
    const [owner, repo] = repository.split('/');
    const { data } = await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullRequest,
      body: content,
    });
    return {
      action: 'create',
      link: data.html_url,
      user: data.user.login,
    };
  }

  /**
   * Update a comment.
   *
   * @param {Object} comment The object containing
   * @param {string} content The GitHub flavored markdown to put in the comment.
   * @return {Promise<Object>} An object containing details about the created comment.
   */
  async updateComment(comment, content) {
    const url = new URL(comment.url),
      path = url.pathname.split('/');
    const [, , owner, repo] = path;
    const { data } = await this.octokit.issues.updateComment({
      // In an ideal world, updateComment would accept comment or comment's url or other field and
      // parse these fields from there.
      owner,
      repo,
      comment_id: path[path.length - 1],
      body: content,
    });
    return {
      action: 'update',
      link: data.html_url,
      user: data.user.login,
    };
  }

  /**
   * Find the comment on the given pull request with the given token.
   *
   * @param {string} repository The repository on which to create the comment, in slug form.
   * @param {number|string} pullRequest The pull request number on GitHub which holds the thread
   *   where the comment should be created.
   * @param {string} commentToken The comment token to locate.
   * @return {Promise<Object>} The comment object from GitHub's API.
   */
  async findComment({ repository, pullRequest, commentToken }) {
    const [owner, repo] = repository.split('/');
    const options = this.octokit.issues.listComments.endpoint.merge({
      owner,
      repo,
      issue_number: pullRequest,
    });
    for await (const page of this.octokit.paginate.iterator(options)) {
      for (const comment of page.data) {
        const match = rDedupeComment.exec(comment.body);
        if (match && match[1] === commentToken) {
          return comment;
        }
      }
    }
    return null;
  }

  /**
   * Post a comment to the given pull request, and deduplicate (best-effort) comments by purpose.
   *
   * @param {string} repository The repository on which to create the comment, in slug form.
   * @param {number|string} pullRequest The pull request number on GitHub which holds the thread
   *   where the comment should be created.
   * @param {string} content The GitHub flavored markdown to put in the comment.
   * @param {string} purpose The purpose of the comment.
   * @return {Promise<Object>} Some simple metadata about the action performed, suitable for
   *   displaying a simple message detailing the action taken.
   */
  async postComment({ repository, pullRequest, content, purpose = null }) {
    const commentToken = purpose && getUniqueToken({ repository, pullRequest, purpose });

    const existingComment =
      commentToken &&
      (await this.findComment({
        repository,
        pullRequest,
        commentToken,
      }));

    const taggedContent = `${getDedupeComment(commentToken)}\n${content}`;
    if (existingComment) {
      if (existingComment.body === taggedContent) {
        return {
          action: null,
          link: existingComment.html_url,
          user: existingComment.user.login,
        };
      }

      return this.updateComment(existingComment, taggedContent);
    }

    return this.createComment(
      {
        repository,
        pullRequest,
      },
      taggedContent
    );
  }
}
