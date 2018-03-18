'use strict'

const io = require('socket.io-client');
const prompt = require('prompt');
const optimist = require('optimist');

const socket = io.connect('http://localhost:8081', {reconnect: true});

const schema = {
  properties: {
    document: {
      description: 'Ingrese el numero de documento',
      type: 'integer',
      replace: '',
      message: 'El documento es requerido \n',
      required: true
    }
  }
};

prompt.override = optimist.argv;

prompt.start();

socket.on('message', (msg) => {
  console.log(`${msg}\n`);
  getPrompt()
});

const getPrompt = () => {
  prompt.get(schema, (err, result) => {

    if (err) {
      console.error('El numero de documento es obligatorio');
      return false;
    }

    if (result.document) {
      socket.emit('message', result.document);
    } else {
      console.log('El sistema se a cerrado');
      prompt.stop();
      process.exit(0)
    }
  });
};

getPrompt();