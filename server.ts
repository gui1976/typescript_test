import { error } from "util";

const pgPromise = require('pg-promise');
const R         = require('ramda');
const request   = require('request-promise');

// Limit the amount of debugging of SQL expressions
const trimLogsSize : number = 200;

// Database interface
interface DBOptions
  { host      : string
  , database  : string
  , user?     : string
  , password? : string
  , port?     : number
  };

// Actual database options
const options : DBOptions = {
  user: 'gui',
  password: 'gui_postgres',
  host: 'localhost',
  database: 'lovelystay_test',
};

console.info('Connecting to the database:',
  `${options.user}@${options.host}:${options.port}/${options.database}`);

const pgpDefaultConfig = {
  promiseLib: require('bluebird'),
  // Log all querys
  query(query) {
    console.log('[SQL   ]', R.take(trimLogsSize,query.query));
  },
  // On error, please show me the SQL
  error(err, e) {
    if (e.query) {
      console.error('[SQL   ]', R.take(trimLogsSize,e.query),err);
    }
  }
};

interface GithubUsers
  { id : number,
    name: string,
    company: string,
    followers: number,
    following: number
  };

const pgp = pgPromise(pgpDefaultConfig);
const db = pgp(options);


//const git_user= process.argv[2];

let  git_user;

process.argv.forEach(function(val, index) {
  console.log(index + ' : ' + val);
  if(index==2) git_user =  val;
 });

console.log('this is the given git user', git_user);

db.none('CREATE TABLE IF NOT EXISTS github_users (id BIGSERIAL, login TEXT PRIMARY KEY, name TEXT, company TEXT, followers TEXT, following TEXT)')
.then(() => request({
  //uri: 'https://api.github.com/users/gaearon',
  uri: `https://api.github.com/users/${git_user}`,
  headers: {
        'User-Agent': 'Request-Promise'
    },
  json: true
}))
.then((data: GithubUsers) => db.one(
  'INSERT INTO github_users (login, name, company, followers, following) VALUES ($[login], $[name], $[company], $[followers], $[following]) RETURNING id', data)
//).then(({id}) => console.log(id))
//.then(() => process.exit(0));
).then(
  ({id}) => {
    console.log(id);
    process.exit(0);
  })
.catch(
        // Log the rejection reason
        (reason) => {
          console.log('Handle rejected promise ('+reason+') here.')
          process.exit(0);
      });