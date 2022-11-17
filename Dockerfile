FROM node:18

WORKDIR /server

COPY package.json ./
COPY yarn.lock ./

RUN npx yarn install

COPY . .

RUN npx yarn prisma generate

RUN npx yarn build

ENV DATABASE_URL="file:db.db"

VOLUME ["/server/prisma"]

EXPOSE 8000

CMD ["npx","yarn", "start"]