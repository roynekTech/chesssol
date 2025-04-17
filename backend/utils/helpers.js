function assignRandomSide() {
    return Math.random() < 0.5 ? 'w' : 'b';
  }
  
  function combineTransactionIds(oldId, newId) {
    return oldId ? `${oldId}||${newId}` : newId; // double pipes as stronger delimiter
  }
  
  module.exports = {
    assignRandomSide,
    combineTransactionIds
  };
  