// Remove retired authenticator data on startup without changing account credentials.
module.exports = async function removeLegacyAuthenticator(User) {
  const fields = ['mfaEnabled', 'mfaSecret', 'mfaPendingSecret', 'mfaLastStep',
    'mfaChallengeHash', 'mfaChallengeExpiresAt', 'mfaSessionVersion',
    'mfaRememberMe', 'mfaAttempts', 'mfaAttemptsUntil', 'twoFactorEnabled', 'twoFactor'];
  await User.collection.updateMany({ $or: fields.map(field => ({ [field]: { $exists: true } })) },
    { $unset: Object.fromEntries(fields.map(field => [field, ''])) });
  for (const index of ['mfaChallengeHash_1', 'twoFactor.challengeHash_1']) {
    try {
      await User.collection.dropIndex(index);
    } catch (error) {
      if (![26, 27].includes(error.code)) throw error; // Collection or index already absent.
    }
  }
};
