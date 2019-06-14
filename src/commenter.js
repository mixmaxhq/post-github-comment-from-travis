import Octokit from '@octokit/rest';
import crypto from 'crypto';
import { URL } from 'url';
import * as utils from './utils';

// Identify/parse and construct the deduplication comment that goes at the top of the PR comment.
const rDedupeComment = /^<!-- post-github-comment-from-travis :: ((?:(?!-->).)+?) -->/m;
const getDedupeComment = (content) => `<!-- post-github-comment-from-travis :: ${content} -->`;

/**
 * Get the unique token for the comment.
 *
 * @param {string} repository The repository, in slug form.
 * @param {string|number} issue_number The issue number on GitHub.
 * @param {string} purpose The purpose of the comment.
 */
function getUniqueToken({ repository, issue_number, purpose }) {
  const hash = crypto.createHash('sha256');
  hash.update('@mixmaxhq/post-github-comment-from-travis\0');
  hash.update(repository);
  hash.update('\0');
  hash.update(String(issue_number));
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
   * @param {?Octokit} client A pre-created octokit instance.
   */
  constructor({ client }) {
    this.octokit = client;
  }

  /**
   * Extract comment parameters from the comment data object.
   *
   * @param {Object} comment The object containing comment details from the GitHub API.
   * @return {Object} An object containing options to interact with the comment.
   */
  _getOptionsFromComment(comment) {
    const url = new URL(comment.url),
      path = url.pathname.split('/');
    const [, , owner, repo] = path;
    // In an ideal world, updateComment and friends would accept the comment object or comment's url
    // or other field and parse these fields from there.
    return {
      owner,
      repo,
      comment_id: path[path.length - 1],
    };
  }

  /**
   * Create a comment.
   *
   * @param {string} owner The repository owner.
   * @param {string} repo The repository name on which to create the comment.
   * @param {number|string} issue_number The issue request number on GitHub which holds the thread
   *   where the comment should be created.
   * @param {string} content The GitHub flavored markdown to put in the comment.
   * @return {Promise<Object>} An object containing details about the created comment.
   */
  async createComment({ owner, repo, issue_number }, content) {
    const { data } = await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number,
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
   * @param {Object} comment The object containing comment details from the GitHub API.
   * @param {string} content The GitHub flavored markdown to put in the comment.
   * @return {Promise<Object>} An object containing details about the created comment.
   */
  async updateComment(comment, content) {
    const { data } = await this.octokit.issues.updateComment({
      ...this._getOptionsFromComment(comment),
      body: content,
    });
    return {
      action: 'update',
      link: data.html_url,
      user: data.user.login,
    };
  }

  /**
   * Remove a comment.
   *
   * @param {Object} comment The object containing comment details from the GitHub API.
   * @return {Promise<void>} Resolves if deleted, rejects if the remove failed.
   */
  async removeComment(comment) {
    await this.octokit.issues.deleteComment(this._getOptionsFromComment(comment));
  }

  /**
   * Find the comment on the given pull request with the given token.
   *
   * @param {string} owner The repository owner.
   * @param {string} repo The repository name on which to create the comment.
   * @param {number|string} issue_number The pull request number on GitHub which holds the thread
   *   where the comment should be created.
   * @param {string} commentToken The comment token to locate.
   * @return {Promise<Object>} The comment object from GitHub's API.
   */
  async findComment({ owner, repo, issue_number, commentToken }) {
    const options = this.octokit.issues.listComments.endpoint.merge({
      owner,
      repo,
      issue_number,
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
   * @param {string} owner The repository owner.
   * @param {string} repo The repository name on which to create the comment.
   * @param {number|string} issue_number The pull request number on GitHub which holds the thread
   *   where the comment should be created.
   * @param {string|Buffer|Readable} content The GitHub flavored markdown to put in the comment.
   * @param {?boolean|string} replace Whether to replace the existing comment (true) or just edit it
   *   in-place (false). If
   * @param {string} purpose The purpose of the comment.
   * @return {Promise<Object>} Some simple metadata about the action performed, suitable for
   *   displaying a simple message detailing the action taken.
   */
  async postComment({ owner, repo, issue_number, content, replace = false, purpose = null }) {
    if (replace && !purpose) {
      throw new Error('replace option enabled but no purpose specified');
    }

    const commentToken =
      purpose && getUniqueToken({ repository: `${owner}/${repo}`, issue_number, purpose });

    const stringContent = utils.toString(content);

    const existingComment =
      commentToken &&
      (await this.findComment({
        owner,
        repo,
        issue_number,
        commentToken,
      }));

    const taggedContent = await stringContent.then((content) =>
      commentToken ? `${getDedupeComment(commentToken)}\n${content}` : content
    );

    const create = () =>
      this.createComment(
        {
          owner,
          repo,
          issue_number,
        },
        taggedContent
      );

    if (existingComment) {
      if (replace !== 'force' && existingComment.body === taggedContent) {
        return {
          action: null,
          link: existingComment.html_url,
          user: existingComment.user.login,
        };
      }

      if (replace) {
        const [, createInfo] = await Promise.all([this.removeComment(existingComment), create()]);
        return {
          ...createInfo,
          action: 'replace',
        };
      }

      return this.updateComment(existingComment, taggedContent);
    }

    return create();
  }
}
