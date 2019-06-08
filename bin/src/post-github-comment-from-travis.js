import yargs from 'yargs';
import { Transform } from 'stream';
import { asCallback } from 'promise-callbacks';
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

const buffer = [];

process.stdin
  .pipe(
    new Transform({
      defaultEncoding: 'utf8',
      transform(chunk, _, cb) {
        buffer.push(chunk);
        cb();
      },
      flush(cb) {
        asCallback(
          postComment(buffer.join(''), { purpose: purpose || null }).then((result) => {
            this.push(result);
            this.push('\n');
          }),
          cb
        );
      },
    })
  )
  .pipe(process.stdout);
