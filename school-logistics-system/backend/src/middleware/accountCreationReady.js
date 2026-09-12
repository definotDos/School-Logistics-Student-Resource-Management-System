module.exports = (req, res, next) => {
  if (req.app.locals.accountCreationReady === false) {
    return res.status(503).json({ message: "New account registration is temporarily paused while student IDs are reviewed. Existing users can still log in. Please contact an administrator." });
  }
  next();
};
