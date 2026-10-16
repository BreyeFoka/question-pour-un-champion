# Questions pour un champion, à la maison

**Live:** [qpuc-mauve.vercel.app](https://qpuc-mauve.vercel.app)

The TV quiz show *Questions pour un champion*, without the studio. A TV or laptop shows the board, the host runs the game from a phone, and each player buzzes from their own phone. Everything stays in sync live.

## How a game works

1. **Board.** On the TV, choose to create a board. It shows a four-letter room code.
2. **Host.** On a phone, join with the code as the *animateur*. The first controller to join becomes the host; the device keeps a host token, so a reload stays in control and nobody else can take over.
3. **Players.** Each player joins with the code, a name and a profession (used as a nod in the questions).
4. **Play.** The host unlocks the buzzers. The first player to buzz locks everyone else out, and the host marks the answer right or wrong.

The three rounds follow the show:

| Round | Rule |
| --- | --- |
| Le 9 points gagnants | First to 9 points goes through |
| Le 4 à la suite | 40-second clock; four right answers in a row wins, and a wrong answer resets your streak |
| Le face-à-face | First to 15 points wins |

## How it works

- **Next.js App Router** with server actions for every game move (create room, claim host, join, buzz, validate an answer, change round).
- **Server-Sent Events** (`/api/events`) push the room's state to the board, the host and every player as soon as it changes.
- Host actions only run with the host token. Buzzes only count from players in the room who aren't locked out.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:3000` on the board device, then join from phones on the same network.

## Known limitations

- **Rooms live in server memory.** That works on a single long-running server. On serverless hosting (such as Vercel) different requests can reach different instances, so a room can disappear or stop updating. For reliable hosting, run it on one Node server, or move rooms and updates to Redis with pub/sub.
- **Sample questions only.** The question generator returns a fixed set of sample questions for any topic. The next step is to generate them with an LLM, using the topic and the players' professions.
- **Host claiming is first come, first served.** Whoever opens the host controller first gets control, so open it before sharing the code.
