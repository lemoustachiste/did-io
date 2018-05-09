const sinon = require('sinon');
const chai = require('chai');
chai.use(require('dirty-chai'));
chai.use(require('sinon-chai'));
chai.should();
const {expect} = chai;

const Injector = require('../../lib/Injector');
const {LDKeyPair} = require('../../lib/ld-key-pair');
const injector = new Injector();
injector.env = {nodejs: true};

const VeresOneDidDoc = require('../../lib/methods/veres-one/veres-did-doc');

describe('VeresOneDidDoc', () => {
  describe('constructor', () => {
    it('should init the doc with context', () => {
      const didDoc = new VeresOneDidDoc();

      expect(didDoc.doc).to.have.property('@context');
    });

    it('should init the id from the document', () => {
      const testId = 'did:v1:test:abc';
      const testDidDoc = {id: testId};

      const didDoc = new VeresOneDidDoc({doc: testDidDoc});
      expect(didDoc.id).to.equal(testId);
    });
  });

  describe('init', () => {
    let didDoc;
    const keyType = 'Ed25519VerificationKey2018';

    beforeEach(() => {
      didDoc = new VeresOneDidDoc({keyType, injector});
    });

    it('should init the did id', async () => {
      const env = 'dev';
      sinon.spy(didDoc, 'generateId');

      await didDoc.init({env});

      expect(didDoc.generateId).to.have.been.called();
    });

    it('should init the authn/authz suites', async () => {
      const env = 'dev';

      await didDoc.init(env);

      expect(didDoc.doc.authentication.length).to.equal(1);
      expect(didDoc.doc.grantCapability.length).to.equal(1);
      expect(didDoc.doc.invokeCapability.length).to.equal(1);
    });
  });

  describe('generateId', () => {
    const keyType = 'Ed25519VerificationKey2018';

    it('should generate a uuid type did', async () => {
      const didType = 'uuid';
      const didDoc = new VeresOneDidDoc({keyType, didType, injector});
      const did = didDoc.generateId({didType, env: 'dev'});

      expect(did).to.match(/^did:v1:test:uuid:.*/);
    });

    it('should generate a nym type did', async () => {
      const didDoc = new VeresOneDidDoc({keyType, didType: 'nym', injector});
      const keyOptions = {
        keyType, injector: didDoc.injector, passphrase: null
      };

      const authKey = await LDKeyPair.generate(keyOptions);
      const did = didDoc.generateId({authKey, env: 'dev'});

      expect(did).to.match(/^did:v1:test:nym:.*/);
    });
  });

  describe('exportKeys', () => {
    it('should return an empty object when no keys are present', async () => {
      const didDoc = new VeresOneDidDoc();
      expect(await didDoc.exportKeys()).to.eql({});
    });

    it('should return a hashmap of keys by key id', async () => {
      const didDoc = new VeresOneDidDoc({injector});
      await didDoc.init({env: 'test', passphrase: null});

      const keys = await didDoc.exportKeys();

      expect(keys[didDoc.id + '#authn-key-1'])
        .to.have.property('secretKeyBase58');
      expect(keys[didDoc.id + '#ocap-invoke-key-1'])
        .to.have.property('secretKeyBase58');
      expect(keys[didDoc.id + '#ocap-grant-key-1'])
        .to.have.property('secretKeyBase58');
    });
  });

  describe('importKeys', () => {
    const exampleDoc = require('../dids/did-v1-test-nym-eddsa-example.json');
    const exampleKeys = require('../dids/did-v1-test-nym-eddsa-example-keys.json');

    it('should import keys', async () => {
      const didDoc = new VeresOneDidDoc({doc: exampleDoc, injector});

      expect(didDoc.keys).to.eql({}); // no keys

      await didDoc.importKeys(exampleKeys);

      const keyId = 'did:v1:test:nym:DfKCjXdt3cKzCsi4EGxhYcYvEa8k1Sz6wBH9MREs3y4r#authn-key-1';

      const authKey = didDoc.keys[keyId];
      expect(authKey).to.exist();

      expect(authKey.id).to.equal(keyId);
    });
  });

  describe('toJSON', () => {
    const keyType = 'Ed25519VerificationKey2018';
    it('should only serialize the document, no other properties', () => {
      const didDoc = new VeresOneDidDoc({keyType, injector});

      expect(JSON.stringify(didDoc))
        .to.equal('{"@context":"https://w3id.org/veres-one/v1"}');
    });
  });
});
