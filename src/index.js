import Commenter from './commenter';
import { getClient, getOptions } from '@mixmaxhq/travis-utils';

const pastTense = new Map(
  Object.entries({
    create: 'created',
    update: 'updated',
    replace: 'replaced',
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
 * @param {boolean|string} replace Whether to replace the comment with a new one (true) or edit it
 *   (false, default). If replace is 'force' then this will re-create the comment even if the
 *   content matches. The purpose flag must be true.
 * @throw {Error} If replace is specified but no purpose is provided.
 */
export async function postComment(content, { auth, purpose = null, replace = false } = {}) {
  const client = new Commenter({ client: getClient({ auth }) });

  const { action, link, user } = await client.postComment(
    getOptions({
      content,
      purpose,
      replace,
    })
  );

  const base = `@${user}'s comment: ${link}`;
  return `${
    action ? pastTense.get(action) || '<verb form missing>' : 'no change applied to'
  } ${base}`;
}
