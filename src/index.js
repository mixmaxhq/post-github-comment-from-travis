import Commenter from './commenter';

const pastTense = new Map(
  Object.entries({
    create: 'created',
    update: 'updated',
  })
);

/**
 * Using Travis environment variables to determine context, post a comment to the appropriate github
 * pull request.
 *
 * @param {string|Buffer|Readable} content GitHub flavored markdown to be displayed in the comment.
 * @param {*} auth Any authorization string or object accepted by octokit.
 * @param {string} purpose The purpose of the comment - multiple calls with the same purpose will
 *   edit the existing comment on the same thread, if possible. Note that multiple comments may be
 *   created, as we don't have thread-level content locking on GitHub.
 */
export default async function(content, { auth = null, purpose = null } = {}) {
  const pullRequest = process.env.TRAVIS_PULL_REQUEST,
    slug = process.env.TRAVIS_REPO_SLUG;

  if (pullRequest === 'false' || !pullRequest || !slug) {
    throw new Error('not running in a travis pull request');
  }

  if (auth === null && process.env.GITHUB_TOKEN) {
    auth = `token ${process.env.GITHUB_TOKEN}`;
  }

  const client = new Commenter({ auth });
  const { action, link, user } = await client.postComment({
    repository: slug,
    pullRequest,
    content,
    purpose,
  });

  const base = `@${user}'s comment: ${link}`;
  return `${
    action ? pastTense.get(action) || '<verb form missing>' : 'no change applied to'
  } ${base}`;
}
