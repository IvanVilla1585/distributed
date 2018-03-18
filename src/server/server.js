'use strict'

const express = require('express');
const fs = require('fs');
const {createServer} = require('http');

const app = express();
const server = createServer(app);
const io = require('socket.io')(server);

let isValid = false;
let isInactive = false;
let isForeman = false;
let isForemanValid = true;
const dataFile = {};
const statusFile = {};

const validForeman = (data, msg) => {
  let valid = true;
  data.map(line => {
    const array = line.split(';');
    if (array[0] !== msg.toString()) {
      valid = valid && (array[2] === 'INACTIVO')
    }
  });
  return valid;
};

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('message', async (msg) => {

    const file = await fs.createReadStream(`${__dirname}/db/data.txt`, 'utf8');

    file.on('data', (chunk) => {
      const data = chunk.split('\n');
      if(chunk && data.length) {
        data.map(line => {
          const array = line.split(';');
          const id = array[0];
          dataFile[id] = line;
          statusFile[id] = array[2];
          if (id === msg.toString() && array[2] === 'ACTIVO') {
            if (array[1] === 'CAPATAZ') {
              isForeman = true;
              isForemanValid = validForeman(data, msg);
              if (isForemanValid) {
                array[2] = 'INACTIVO';
                dataFile[id] = array.join(';');
              }
            } else {
              array[2] = 'INACTIVO';
              dataFile[id] = array.join(';');
            }
            isValid = true;
          } else if (id === msg.toString() && array[2] === 'INACTIVO') {
            isInactive = true;
            if (array[1] === 'CAPATAZ') {
              isForeman = true;
            }
          }
        });
      }
    });
    file.on('close', async () => {
      if (isValid) {
        let string = '';
        Object.keys(dataFile).map(key => {
          if (string) {
            string += `\n${dataFile[key]}`;
          } else {
            string += `${dataFile[key]}`;
          }
        });
        const newFile = await fs.createWriteStream(`${__dirname}/db/data.txt`);
        newFile.write(string);
        newFile.end();
        if (isForeman && isForemanValid) {
          isValid = isForeman = isForemanValid = isInactive = false;
          socket.emit('message', `Se registro la salida del capataz con documento numero ${msg}`);
        } else if (isForeman && !isForemanValid) {
          isValid = isForeman = isForemanValid = isInactive = false;
          socket.emit('message', 'El capataz no puede registrar su salida hasta que todos los mineros salgan');
        } else {
          isValid = isForeman = isForemanValid = isInactive = false;
          socket.emit('message', `Se registro la salida del minero con documento numero ${msg}`);
        }
      } else {
        if (isInactive) {
          socket.emit('message', `El ${isForeman ? 'capataz' : 'minero'} con numero de documento ${msg} ya registro la salida`);
          isValid = isForeman = isForemanValid = isInactive = false;
        } else {
          socket.emit('message', 'Usuario invalido');
          isValid = isForeman = isForemanValid = isInactive = false;
        }
      }
    })
  });
});

server.listen(8081, () => console.log('Server running on the port 8081'));
