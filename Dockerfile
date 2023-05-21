FROM node:18-alpine

# Node & epoll dependencies 
RUN apk update
RUN apk add --no-cache gcc g++ make python3

RUN npm install -g pnpm

WORKDIR /server

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN pnpm i

COPY . .

RUN pnpm build


ENV DATABASE_FOLDER="database"
VOLUME ["/server/database"]

ENV PORT="8000"
EXPOSE 8000

CMD ["pnpm", "start"]