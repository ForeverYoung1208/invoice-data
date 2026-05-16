import { JobsParser } from '../../../src/lib/parsers/JobsParser';
import { ClientsParser } from '../../../src/lib/parsers/ClientsParser';
import { PartsParser } from '../../../src/lib/parsers/PartsParser';
import { DevicePartsParser } from '../../../src/lib/parsers/DevicePartsParser';
import path from 'path';

async function runTests() {
  try {
    console.log('Testing JobsParser...');
    const jobsParser = new JobsParser();
    const jobs = await jobsParser.parse(path.join(__dirname, '../../../tests/fixtures/mock-data/jobs.csv'));
    console.log(`Parsed ${jobs.length} jobs.`);
    console.log('First job:', jobs[0]);

    console.log('\nTesting ClientsParser...');
    const clientsParser = new ClientsParser();
    const clients = await clientsParser.parse(path.join(__dirname, '../../../tests/fixtures/mock-data/clients.csv'));
    console.log(`Parsed ${clients.length} clients.`);
    console.log('First client:', clients[0]);

    console.log('\nTesting PartsParser...');
    const partsParser = new PartsParser();
    const parts = await partsParser.parse(path.join(__dirname, '../../../tests/fixtures/mock-data/parts.csv'));
    console.log(`Parsed ${parts.length} parts.`);
    console.log('First part:', parts[0]);

    console.log('\nTesting DevicePartsParser...');
    const devicePartsParser = new DevicePartsParser();
    const deviceParts = await devicePartsParser.parse(path.join(__dirname, '../../../tests/fixtures/mock-data/devices.csv'));
    console.log(`Parsed ${deviceParts.length} device parts.`);
    console.log('First device part:', deviceParts[0]);

    console.log('\nALL TESTS PASSED!');
  } catch (error) {
    console.error('\nTEST FAILED!');
    console.error(error);
    process.exit(1);
  }
}

runTests();
