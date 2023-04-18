// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

import "./interface/IFormulas.sol";

/**
 * @title The implementation of IFormulas interface
 * @author Polytrade.Finance
 * @dev Implementation of all functions related to Invoice formulas
 */
contract Formulas is IFormulas {
    uint private constant _PRECISION = 1E4;

    /**
     * @dev Calculate the advance amount: (amount * advance Fee Percentage)
     * @return uint Advance Amount
     * @param amount, uint input from user
     * @param _advanceFeePercentage, uint input from user
     */
    function advanceAmountCalculation(
        uint amount,
        uint _advanceFeePercentage
    ) external pure returns (uint) {
        return amount - ((amount * _advanceFeePercentage) / _PRECISION);
    }
}
