/* vim: ts=4:sw=4
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

describe("Key generation", function() {
    var count = 10;
    this.timeout(count*2000);

    function validateStoredKeyPair(keyPair) {
        /* Ensure the keypair matches the format used internally by libaxolotl */
        assert.isObject(keyPair, 'Stored keyPair is not an object');
        assert.instanceOf(keyPair.pubKey, ArrayBuffer);
        assert.instanceOf(keyPair.privKey, ArrayBuffer);
        assert.strictEqual(keyPair.pubKey.byteLength, 33);
        assert.strictEqual(new Uint8Array(keyPair.pubKey)[0], 5);
        assert.strictEqual(keyPair.privKey.byteLength, 32);
    }
    function itStoresPreKey(keyId) {
        it('prekey ' + keyId + ' is valid', function(done) {
            return textsecure.storage.axolotl.getPreKey(keyId).then(function(keyPair) {
                validateStoredKeyPair(keyPair);
            }).then(done,done);
        });
    }
    function itStoresSignedPreKey(keyId) {
        it('signed prekey ' + keyId + ' is valid', function(done) {
            return textsecure.storage.axolotl.getSignedPreKey(keyId).then(function(keyPair) {
                validateStoredKeyPair(keyPair);
            }).then(done,done);
        });
    }
    function validateResultKey(resultKey) {
        return textsecure.storage.axolotl.getPreKey(resultKey.keyId).then(function(keyPair) {
            assertEqualArrayBuffers(resultKey.publicKey, keyPair.pubKey);
        });
    }
    function validateResultSignedKey(resultSignedKey) {
        return textsecure.storage.axolotl.getSignedPreKey(resultSignedKey.keyId).then(function(keyPair) {
            assertEqualArrayBuffers(resultSignedKey.publicKey, keyPair.pubKey);
        });
    }

    before(function(done) {
        localStorage.clear();
        axolotl.util.generateIdentityKeyPair().then(function(keyPair) {
            return textsecure.storage.axolotl.put('identityKey', keyPair);
        }).then(done, done);
    });

    describe('the first time', function() {
        var result;
        /* result should have this format
         * {
         *   preKeys: [ { keyId, publicKey }, ... ],
         *   signedPreKey: { keyId, publicKey, signature },
         *   identityKey: <ArrayBuffer>
         * }
         */
        before(function(done) {
            generateKeys(count).then(function(res) {
                result = res;
            }).then(done,done);
        });
        for (var i = 1; i <= count; i++) {
            itStoresPreKey(i);
        }
        itStoresSignedPreKey(1);

        it('result contains ' + count + ' preKeys', function() {
            assert.isArray(result.preKeys);
            assert.lengthOf(result.preKeys, count);
            for (var i = 0; i < count; i++) {
                assert.isObject(result.preKeys[i]);
            }
        });
        it('result contains the correct keyIds', function() {
            for (var i = 0; i < count; i++) {
                assert.strictEqual(result.preKeys[i].keyId, i+1);
            }
        });
        it('result contains the correct public keys', function(done) {
            Promise.all(result.preKeys.map(validateResultKey)).then(function() {
                done();
            }).catch(done);
        });
        it('returns a signed prekey', function(done) {
            assert.strictEqual(result.signedPreKey.keyId, 1);
            assert.instanceOf(result.signedPreKey.signature, ArrayBuffer);
            validateResultSignedKey(result.signedPreKey).then(done,done);
        });
    });
    describe('the second time', function() {
        var result;
        before(function(done) {
            generateKeys(count).then(function(res) {
                result = res;
            }).then(done,done);
        });
        for (var i = 1; i <= 2*count; i++) {
            itStoresPreKey(i);
        }
        itStoresSignedPreKey(1);
        itStoresSignedPreKey(2);
        it('result contains ' + count + ' preKeys', function() {
            assert.isArray(result.preKeys);
            assert.lengthOf(result.preKeys, count);
            for (var i = 0; i < count; i++) {
                assert.isObject(result.preKeys[i]);
            }
        });
        it('result contains the correct keyIds', function() {
            for (var i = 1; i <= count; i++) {
                assert.strictEqual(result.preKeys[i-1].keyId, i+count);
            }
        });
        it('result contains the correct public keys', function(done) {
            Promise.all(result.preKeys.map(validateResultKey)).then(function() {
                done();
            }).catch(done);
        });
        it('returns a signed prekey', function(done) {
            assert.strictEqual(result.signedPreKey.keyId, 2);
            assert.instanceOf(result.signedPreKey.signature, ArrayBuffer);
            validateResultSignedKey(result.signedPreKey).then(done,done);
        });
    });
    describe('the third time', function() {
        var result;
        before(function(done) {
            generateKeys(count).then(function(res) {
                result = res;
            }).then(done,done);
        });
        for (var i = 1; i <= 3*count; i++) {
            itStoresPreKey(i);
        }
        itStoresSignedPreKey(2);
        itStoresSignedPreKey(3);
        it('result contains ' + count + ' preKeys', function() {
            assert.isArray(result.preKeys);
            assert.lengthOf(result.preKeys, count);
            for (var i = 0; i < count; i++) {
                assert.isObject(result.preKeys[i]);
            }
        });
        it('result contains the correct keyIds', function() {
            for (var i = 1; i <= count; i++) {
                assert.strictEqual(result.preKeys[i-1].keyId, i+2*count);
            }
        });
        it('result contains the correct public keys', function(done) {
            Promise.all(result.preKeys.map(validateResultKey)).then(function() {
                done();
            }).catch(done);
        });
        it('result contains a signed prekey', function(done) {
            assert.strictEqual(result.signedPreKey.keyId, 3);
            assert.instanceOf(result.signedPreKey.signature, ArrayBuffer);
            validateResultSignedKey(result.signedPreKey).then(done,done);
        });
        it('deletes signed key 1', function() {
            textsecure.storage.axolotl.getSignedPreKey(1).then(function(keyPair) {
                assert.isUndefined(keyPair);
            });
        });
    });
});
