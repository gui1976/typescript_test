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
    login: string,
    name: string,
    company: string,
    followers: number,
    following: number,
    location: string
  };

const pgp = pgPromise(pgpDefaultConfig);
const db = pgp(options);

/*
let  git_user;

process.argv.forEach(function(val, index) {
  console.log(index + ' : ' + val);
  if(index==2) git_user =  val;
 });

console.log('this is the given git user', git_user);
*/

//https://www.npmjs.com/package/command-line-args
const optionDefinitions = [
  { name: 'username', alias: 'u', type: String, defaultOption: true},
  { name: 'stats', alias: 's', type: Boolean},
  { name: 'location', alias: 'l', type: Boolean}
]

const commandLineArgs = require('command-line-args')
const argOptions = commandLineArgs(optionDefinitions)

if (argOptions.username === undefined && 
    argOptions.stats    === undefined &&
    argOptions.location === undefined
  )
{
  console.error("Please use one or more of the following parameters:\n\
                  * add username              : <username>\n\
                  * Users grouped by location : -s | --stats\n\
                  * Users from Lisbon         : -l | --location\n");
  process.exit(0);
}

if(argOptions.username !== undefined)
{
  db.none('CREATE TABLE IF NOT EXISTS github_users (id BIGSERIAL, login TEXT PRIMARY KEY, name TEXT, company TEXT, followers TEXT, following TEXT, location TEXT)')
  .then(() => request({
    //uri: 'https://api.github.com/users/gaearon',
    uri: `https://api.github.com/users/${argOptions.username}`,
    headers: {
          'User-Agent': 'Request-Promise'
      },
    json: true
  }))
  .then((data: GithubUsers) => db.one(
    'INSERT INTO github_users (login, name, company, followers, following, location) VALUES ($[login], $[name], $[company], $[followers], $[following], $[location]) RETURNING id', data)
  ).then(
    ({id}) => console.log(id))
  .catch(
    // Log the rejection reason
    (reason) => {
      console.log('Handle rejected promise ('+reason+') here.')
  })
  .then(() => process.exit(0));
}

if(argOptions.stats === true)
{
  console.info('TODO stats')
}

if(argOptions.location === true)
{
  //https://vitaly-t.github.io/pg-promise/Database.html#each
  db.each(`SELECT id, login, name FROM github_users WHERE location LIKE '%Lisbon%'`, [], row => {
    row.id = +row.id; // leading `+` is short for `parseInt()`
})
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
    .then(data => {data.forEach((element) => {console.log(`${element.login}  ${element.name}`)})
    })
    .catch(error => {
      console.log('Handle rejected promise ('+error+') here.')
    })
    .then(() => process.exit(0));
}