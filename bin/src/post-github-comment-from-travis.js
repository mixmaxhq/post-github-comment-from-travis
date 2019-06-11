import yargs from 'yargs';
import postComment from '..';

const { argv } = yargs
  .usage('post-github-comment-from-travis [--purpose <purpose>]')
  .alias('p', 'purpose')
  .nargs('p', 1)
  .describe('p', 'Set a comment purpose, to key on')
  .epilog("pipe data into the command to set the comment's content")
  .help('h')
  .alias('h', 'help');

const { purpose } = argv;

if (purpose === undefined) {
  console.log('you should probably set a purpose by passing the --purpose flag');
  console.log("if you're certain you want to post a comment without a purpose, use --no-purpose");
  process.exit(1);
}

postComment(process.stdin, { purpose: purpose || null }).then(
  (result) => console.log(result),
  (err) => {
    console.error('error posting comment:', err);
    process.exit(1);
  }
);
