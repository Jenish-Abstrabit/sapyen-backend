// Example controller
exports.welcome = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the API'
  });
}; 