FROM image-registry.openshift-image-registry.svc:5000/openshift/nodejs@sha256:482544a871ad56aa24dedf7bc469feb52194fedbc5d1785399b6a8e79b6cc28a

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]