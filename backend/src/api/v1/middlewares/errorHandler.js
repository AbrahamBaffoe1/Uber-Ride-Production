export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    status: 'error',
    code: status,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// No need for export statement as we're using the named export above
