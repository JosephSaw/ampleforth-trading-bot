const Trader = artifacts.require("Trader");

module.exports = function (deployer) {
  deployer.deploy(Trader, '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735', '0x027dbcA046ca156De9622cD1e2D907d375e53aa7', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
};
