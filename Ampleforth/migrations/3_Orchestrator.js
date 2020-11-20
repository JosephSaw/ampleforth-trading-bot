const Orchestrator = artifacts.require("Orchestrator");

module.exports = function (deployer) {
  deployer.deploy(Orchestrator, "0xa70070527E83B5E656ed4D99684256E4cC2eF5B7");
};
