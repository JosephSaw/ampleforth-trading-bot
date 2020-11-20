pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract Trader is Ownable {
    address daiAddress;
    address ampleAddress;
    address uniswapV2RouterAddress;

    constructor(
        address _daiAddress,
        address _ampleAddress,
        address _uniswapV2RouterAddress
    ) public {
        daiAddress = _daiAddress;
        ampleAddress = _ampleAddress;
        uniswapV2RouterAddress = _uniswapV2RouterAddress;
    }

    function swapDaiForAmple(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address[] memory path,
        uint256 deadline
    ) external onlyOwner returns (uint256[] memory) {
        IERC20 DAI = IERC20(daiAddress);

        require(
            DAI.approve(address(uniswapV2RouterAddress), _amountIn),
            "approve failed."
        );

        IUniswapV2Router02 ROUTER = IUniswapV2Router02(uniswapV2RouterAddress);

        return
            ROUTER.swapExactTokensForTokens(
                _amountIn,
                _amountOutMin,
                path,
                address(this),
                deadline
            );
    }

    function swapAmpleForDai(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address[] memory path,
        uint256 deadline
    ) external onlyOwner returns (uint256[] memory) {
        IERC20 AMPLE = IERC20(ampleAddress);

        require(
            AMPLE.approve(address(uniswapV2RouterAddress), _amountIn),
            "approve failed."
        );

        IUniswapV2Router02 ROUTER = IUniswapV2Router02(uniswapV2RouterAddress);

        return
            ROUTER.swapExactTokensForTokens(
                _amountIn,
                _amountOutMin,
                path,
                address(this),
                deadline
            );
    }

    function withdrawDAI() external onlyOwner {
        IERC20 DAI = IERC20(daiAddress);
        DAI.transfer(owner(), DAI.balanceOf(address(this)));
    }
}
