import { IncomingMessage, createServer } from 'http';

const BASE_URL = 'http://localhost:3000';

const parseCookies = (request: IncomingMessage): Record<string, string> => {
  let cookieStr = request.headers.cookie ?? '';
  let cookieList = cookieStr.split(';');
  let cookies: Record<string, string> = {};

  cookieList.forEach((cookie) => {
    let key = cookie.slice(0, cookie.indexOf('=')).trim();
    let value = cookie.slice(cookie.indexOf('=') + 1, cookie.length);

    cookies[key] = value;
  });

  return cookies;
};

const users = [
  {
    id: '1',
    name: 'Raj',
    email: 'raj@gmail.com',
  },
];

interface Session {
  accessToken: string;
  refreshToken: string;
  accessTokenExp: number;
  refreshTokenExp: number;
  userId: string;
}

let sessions: Session[] = [];

function isUserExists(id: string) {
  return users.some((user) => user.id === id);
}
function parseUser(user: string) {
  let parsedUser: Record<string, string> = {};

  user.split('&').forEach((str) => {
    let key = str.slice(0, str.indexOf('=')).trim();
    let val = str.slice(str.indexOf('=') + 1, str.length);

    parsedUser[key] = val;
  });

  return parsedUser;
}

function generateRandomKey() {
  let strings = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
  ];
  return Array.from({ length: 16 })
    .fill(0)
    .map((v) => strings[Math.round(Math.random() * strings.length)])
    .join('');
}

interface AuthorizationToken {
  id: string;
  key: string;
}

let authorizationTokens: AuthorizationToken[] = [];

createServer((req, res) => {
  const url = new URL(req.url ?? '/', BASE_URL);
  console.log(url);
  if (url.pathname === '/') {
    res.end('<h1>Home</h1>');
  }

  if (url.pathname === '/oauth') {
    if (
      !url.searchParams.get('clientId') ||
      !url.searchParams.get('callback')
    ) {
      res.statusCode = 302;
      res.setHeader('Location', BASE_URL);
      res.end();
    } else {
      let cookies = parseCookies(req);

      if (cookies['user']) {
        const user = parseUser(cookies['user']);
        if (isUserExists(user['id'])) {
          let authorizationKey = generateRandomKey();
          authorizationTokens.push({
            id: user['id'],
            key: authorizationKey,
          });
          res.statusCode = 302;
          res.setHeader(
            'Location',
            url.searchParams.get('callback')! +
              '?authorization=' +
              authorizationKey
          );
          res.end();
        } else {
          res.end('Please login first to authenticate. Invalid');
        }
      } else {
        res.end('Please login first to authenticate');
      }
    }
  }

  if (url.pathname === '/authorize') {
    let key = url.searchParams.get('authorizationKey');
    if (!key) {
      res.end('<h1>No Authorization Key was provided</h1>');
    } else {
      let authorization = authorizationTokens.find((item) => item.key === key);
      if (!authorization) {
        res.end('<h1>Invalid Authorization Key</h1>');
      } else {
        let user = users.find((user) => user.id === authorization!.id);

        if (!user) {
          res.end('<p>Invalid user</p>');
        } else {
          let accessToken = generateRandomKey();
          let refreshToken = generateRandomKey();
          authorizationTokens = authorizationTokens.filter(
            (item) => item.key !== key
          );
          let session: Session = {
            userId: user.id,
            accessToken: accessToken,
            refreshToken: refreshToken,
            accessTokenExp: new Date().getTime() / 1000 + 5,
            refreshTokenExp: new Date().getTime() / 1000 + 60 * 60 * 24 * 30,
          };
          sessions.push(session);
          res.end(JSON.stringify(session));
        }
      }
    }
  }

  if (url.pathname === '/user') {
    let accessToken = url.searchParams.get('accessToken');

    if (!accessToken) {
      res.end('<p>Forbidden</p>');
    } else {
      let session = sessions.find(
        (session) => session.accessToken === accessToken
      );
      if (!session) {
        res.end('<p>Invalid Access Token</p>');
      } else {
        let currentTime = new Date().getTime() / 1000;
        if (session.accessTokenExp < currentTime) {
          res.end('<p>Token Expired</p>');
        } else {
          res.end(
            JSON.stringify(users.find((user) => user.id === session!.userId))
          );
        }
      }
    }
  }

  if(url.pathname === '/accessToken'){
    if(!url.searchParams.get('refreshToken')){
      res.end("<h1>forbidden</h1>")
    }else{
      let session = sessions.find((ses) => ses.refreshToken === url.searchParams.get("refreshToken"))
      if(!session){
        res.end("<h1>Invalid refresh token</h1>")
      }else{
        if(session.refreshTokenExp < (new Date().getTime() / 1000)){
          res.end("<h1>Refresh Token Expired</h1>")
        }else{
          let newAccessToken = generateRandomKey()
          let newAccessTokenExp = ((new Date().getTime()) / 1000) + 60 * 60
          sessions = sessions.map((ses) => {
            if(ses.refreshToken === session.refreshToken){ 
              return {
                ...ses,
                accessToken:newAccessToken,
                accessTokenExp: newAccessTokenExp
              }
            }else{
              return ses
            }
          })

          res.end(JSON.stringify({newAccessToken,newAccessTokenExp}))
        }
      }
    }
  }
}).listen('3000', () => {
  console.log('Server started 🚀');
});
