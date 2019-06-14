import yargs from 'yargs';
import { postComment } from '..';

const { argv } = yargs
  .usage('post-github-comment-from-travis [--purpose <purpose> [--replace [force]]]')
  .alias('p', 'purpose')
  .alias('r', 'replace')
  .nargs('p', 1)
  .describe('p', 'Set a comment purpose, to key on')
  .epilog("pipe data into the command to set the comment's content")
  .help('h')
  .alias('h', 'help');

const { purpose, replace } = argv;

if (purpose === undefined) {
  console.error('you should probably set a purpose by passing the --purpose flag');
  console.error("if you're certain you want to post a comment without a purpose, use --no-purpose");
  process.exit(1);
}

if (replace && ![true, 'force'].includes(replace)) {
  console.error('the replace option only supports the optional force parameter');
  process.exit(1);
}

postComment(process.stdin, { purpose: purpose || null, replace }).then(
  (result) => console.log(result),
  (err) => {
    console.error('error posting comment:', err);
    process.exit(1);
  }
);
