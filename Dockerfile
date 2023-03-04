FROM node:18

WORKDIR /server

COPY package.json ./
COPY yarn.lock ./

RUN npx yarn install

COPY . .

RUN npx yarn build

ENV DATABASE_FOLDER="database"

VOLUME ["/server/database"]

EXPOSE 8000

CMD ["npx","yarn", "start"]