// test-mdns-broadcast.js
const { Bonjour } = require('bonjour-service');
const instance = new Bonjour();

// Test what we're actually broadcasting
const testService = instance.publish({
  name: 'Test_JunctionRelay_Device',
  type: 'junctionrelay',
  protocol: 'tcp',
  port: 80,
  txt: { test: 'true' }
});

console.log('Broadcasting test service...');

// Listen for our own broadcasts
instance.find({ type: 'junctionrelay' }, (service) => {
  console.log('Found junctionrelay service:', service.name, service.addresses);
});

setTimeout(() => {
  console.log('Test complete');
  instance.destroy();
  process.exit(0);
}, 3000);