FROM node:18-alpine

WORKDIR /server

COPY package.json ./
COPY yarn.lock ./

# Node & epoll dependencies 
RUN apk update
RUN apk add --no-cache gcc g++ make python3

RUN npx yarn install

COPY . .

RUN npx yarn build

ENV DATABASE_FOLDER="database"

VOLUME ["/server/database"]

EXPOSE 8000

CMD ["npx","yarn", "start"]