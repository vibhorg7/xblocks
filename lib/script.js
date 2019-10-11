//provides insurance to customer
function get_insurance(i, req, array2) {
    i.owns.balance += (0.05 * req)
    var l = array2.length
    if (l == 0) {
        array2.push(1)
    } else {
        var last = array2[l - 1]
        array2.push(last + 1)
    }
}

//function to verify availability of home loan with reg. dept.
function checkHomeId(reqHome, array) {
    var i = 0
    for (i = 0; i < array.length; i++) {
        if (array[i] === reqHome) {
            array.splice(i, 1)
            return 0
        }
    }
    return 1
}

//Updates the insurance record of insurance provider
function updateInsRec(a) {
    return getParticipantRegistry('org.xbank.partyInfo.insProvider')
        .then(function(participantRegistry) {
            return participantRegistry.update(a)
        })
}

//Updates record of registration dept
function updateRegDept(y, a) {
    return getParticipantRegistry('org.xbank.partyInfo.regDept')
        .then(function(participantRegistry) {
            updateInsRec(a)
            return participantRegistry.updateAll([y])
        })
}

//updates home loan details of involved customer
function updateHomeLoan(p, y, a) {
    return getAssetRegistry('org.xbank.assetInfo.homeLoanDetails')
        .then(function(assetRegistry) {
            updateRegDept(y, a)
            return assetRegistry.updateAll([p])
        })
}

//updates account balanes of involved entities
function updateAccount(x, p, y, z, a) {
    return getAssetRegistry('org.xbank.assetInfo.account')
        .then(function(assetRegistry) {
            updateHomeLoan(p, y, a)
            return assetRegistry.updateAll([x, z])
        })
}

function updateDealerRec(y, a) {
    return getParticipantRegistry('org.xbank.partyInfo.vehicalDealer')
        .then(function(participantRegistry) {
            updateInsRec(a)
            return participantRegistry.updateAll([y])
        })
}

function updatevehicalLoan(p, y, a) {
    return getAssetRegistry('org.xbank.assetInfo.vehicalLoanDetails')
        .then(function(assetRegistry) {
            updateDealerRec(y, a)
            return assetRegistry.updateAll([p])
        })
}

function updateAccount1(x, p, y, z, a) {
    return getAssetRegistry('org.xbank.assetInfo.account')
        .then(function(assetRegistry) {
            updatevehicalLoan(p, y, a)
            return assetRegistry.updateAll([x, z])
        })
}

//calculates pension
function pensionCalc(sal, type) {
    var p = 1.0
    if (type == "govtEmp") {
        p = sal * 0.5
        return p
    } else {
        p = sal * 0.4
        return p
    }

}

//function to check sufficiency of funds for transfer
function cbtApproval(bal1, fees, amt) {
    if ((bal1 - fees - amt) > 0) {
        return 1
    } else {
        return 0
    }
}

//adds transporation fees to total amount and verifies transaction by transporter
function transporter(amt, fees) {
    var newAmt = amt
    newAmt = newAmt + fees
    return newAmt
}

//function to check credit score for loan approval
function cscoreCheck(cs) {
    if (cs < 200) {
        return 0
    }
}

//function to calculate emi for loan
function calcEmi(year, req, sal, roi) {
    var msal = sal / 12
    var p = (req * roi) * year
    req = req + p
    var emi = req / year
    emi = emi / 12
    return emi
}

//function for regulator to verify salary compared to emi
function regulator(year, req, sal, roi) {
    var msal = sal / 12
    var p = (req * roi) * year
    req = req + p
    var emi = req / year
    emi = emi / 12
    if (sal < emi) { return 0 } else { return 1 }

}

/*...............................cross border transcation............................*/

/**
 * @param {org.xbank.transaction.Transfer} tdata
 * @transaction
 */
function transfer(tdata) {
    var bal1 = tdata.fromAcc.balance
    var bal2 = tdata.dealer.balance
    var p = tdata.price
    var qty = tdata.quantity
    var amt = p * qty
    var tbal = tdata.transporter.owns.balance
    var fees = amt * 0.05
    if (amt < 0) { throw new Error('Amount Cannot be Negative!') }
    var ans = cbtApproval(bal1, fees, amt)

    if (ans == 1) {
        var tamt = transporter(amt, fees)
        tdata.fromAcc.balance -= tamt;
        tdata.dealer.balance += amt;
        tdata.transporter.owns.balance += fees
    } else {

        throw new Error('Insufficient balance')
    }

    return getAssetRegistry('org.xbank.assetInfo.account')
        .then(function(assetRegistry) {
            return assetRegistry.updateAll([tdata.fromAcc, tdata.dealer, tdata.transporter.owns])
        })
}

/*...............................home loan transcation............................*/

/**
 * @param {org.xbank.transaction.homeLoan} ldata
 * @transaction
 */
function hloan(ldata) {
    var cs = ldata.creditScore
    var sal = ldata.salary
    var area = ldata.areaSqFt
    var req = ldata.price
    var reqHome = ldata.HomeID
    var year = ldata.year
    var roi = 0.1
    var array = ldata.registerar.homeRec
    var array2 = ldata.insurance_provider_name.policy_given_rec
    var emi = calcEmi(year, req, sal, roi)

    if (cscoreCheck(cs) == 0) {
        throw new Error('cannot provide loan due to low credit score! Required More than 200')
    } else if (regulator(year, req, sal, roi) == 0) {
        throw new Error('Cannot provide loan due to less salary')
    } else if (checkHomeId(reqHome, array) == 1) {
        throw new Error("Cannot provide loan due to unidentified home id.Registration department rejects loan")
    } else {
        req = req * 0.8
        ldata.loanee.balance += req
        ldata.loan_no.amount = req
        ldata.loan_no.takenby = ldata.cs.customerID
        ldata.loan_no.roi = roi
        ldata.loan_no.duration_of_repayment = year
        ldata.loan_no.monthly_emi = emi
        ldata.registerar.homeRec = array
        get_insurance(ldata.insurance_provider_name, req, array2)
        ldata.insurance_provider_name.policy_given_rec = array2


    }

    updateAccount(ldata.loanee, ldata.loan_no, ldata.registerar, ldata.insurance_provider_name.owns, ldata.insurance_provider_name)
    return

}


/*...............................vehicle loan transcation............................*/

/**
 * @param {org.xbank.transaction.vehicleLoan} vdata
 * @transaction
 */
function vloan(vdata) {
    var cs = vdata.creditScore
    var sal = vdata.salary
    var price = vdata.price
    var req = vdata.price
    var roi = 0.06
    var year = vdata.no_of_year
    var type = vdata.type
    var array = vdata.dealer.dealerRec
    var array2 = vdata.insurance_provider_name.policy_given_rec
    var vehicalId = vdata.modelNumber
    var emi = calcEmi(year, req, sal, roi)
    if (cs < 200) {
        throw new Error('cannot provide loan due to low credit score!')
    } else if (regulator(year, req, sal, roi) == 0) {
        throw new Error("cannot provide loan due to less salary!")
    } else if (checkHomeId(vehicalId, array)) {
        throw new Error("Cannot provide loan due to invalid model number.Dealer denied transaction")
    } else {
        vdata.loanee.balance += req
        vdata.loan_no.amount = req
        vdata.loan_no.takenby = vdata.cs.customerID
        vdata.loan_no.roi = roi
        vdata.loan_no.duration_of_repayment = year
        vdata.loan_no.monthly_emi = emi
        vdata.dealer.dealerRec = array
        get_insurance(vdata.insurance_provider_name, req, array2)
        vdata.insurance_provider_name.policy_given_rec = array2
    }
    updateAccount1(vdata.loanee, vdata.loan_no, vdata.dealer, vdata.insurance_provider_name.owns, vdata.insurance_provider_name)
}







/*...............................retirement benefit program............................*/

/**
 * @param {org.xbank.transaction.retirementBenefitProgram} rdata
 * @transaction
 */
function rbp(rdata) {
    var nation = rdata.user.nationality
    var age = rdata.age
    var sal = rdata.salary
    var yos = rdata.yearsOfService
    var type = rdata.employementType


    if (nation != "USA") {
        throw new Error('Transaction denied by Regulator!')
    } else if (yos <= 10) {
        throw new Error('Must have years of service greater than 10 to avail this benefit.Transaction denied by Employeer')
    } else if (age < 60) {
        throw new Error('Age is less to avail this benefit.Transaction denied by govt. agency')
    } else {
        var p = pensionCalc(sal, type)
        rdata.user.owns.balance = p + rdata.user.owns.balance
    }

    return getAssetRegistry('org.xbank.assetInfo.account')
        .then(function(assetRegistry) {
            return assetRegistry.update(rdata.user.owns)
        })

}





/*............................... commercial vehicle loan transcation............................*/

/**
 * @param {org.xbank.transaction.commercialLoan} cvdata
 * @transaction
 */
function cvloan(cvdata) {
    var cs = cvdata.creditScore
    var sal = cvdata.salary
    var price = cvdata.price
    var req = cvdata.price
    var roi = 0.11
    var year = cvdata.no_of_year
    var type = type
    var array = cvdata.dealer.dealerRec
    var array2 = cvdata.insurance_provider_name.policy_given_rec
    var vehicalId = cvdata.modelNumber
    var emi = calcEmi(year, req, sal, roi)
    if (cs < 200) {
        throw new Error('cannot provide loan due to low credit score!')
    } else if (regulator(year, req, sal, roi) == 0) {
        throw new Error("cannot provide loan due to less salary!")
    } else if (checkHomeId(vehicalId, array)) {
        throw new Error("Cannot provide loan due to invalid model number.Dealer denied transaction")
    } else {
        cvdata.loanee.balance += req * 0.8
        cvdata.loan_no.amount = req * 0.8
        cvdata.loan_no.takenby = cvdata.cs.customerID
        cvdata.loan_no.roi = 0.11
        cvdata.loan_no.duration_of_repayment = year
        cvdata.loan_no.monthly_emi = emi
        cvdata.dealer.dealerRec = array
        get_insurance(cvdata.insurance_provider_name, req, array2)
        cvdata.insurance_provider_name.policy_given_rec = array2
    }
    updateAccount1(cvdata.loanee, cvdata.loan_no, cvdata.dealer, cvdata.insurance_provider_name.owns, cvdata.insurance_provider_name)



}


/*...............................government benefit program............................*/




/**
 * @param {org.xbank.transaction.governmentBenefitScheme} gdata
 * @transaction
 */
function gws(gdata) {
    var occ = gdata.user.occupation
    var gen = gdata.user.gender
    var type = gdata.type_of_benefit
    var req = gdata.loan_amt
    var salary = gdata.monthly_salary

    if (type == "women_welfare_scheme") {
        if (gen != "female") {
            throw new Error('Sorry! this benefit is only for women.')
        } else if (gdata.belongs_to.owns.balance < 50000) {
            throw new Error("maximum benefits availed")
        } else if (salary < 10000) {
            throw new Error("maximum benefits availed")
        } else {
            gdata.user.owns.balance += 25000
            gdata.belongs_to.owns.balance -= 25000
        }
    } else {
        if (occ != "Farmer") {
            throw new Error("Sorry! Program is only for farmers")
        } else if (gdata.belongs_to.owns.balance < 50000) {
            throw new Error("maximum benefits availed")
        } else {
            gdata.user.owns.balance += req
            gdata.belongs_to.owns.balance -= req
        }
    }

    return getAssetRegistry('org.xbank.assetInfo.account')
        .then(function(assetRegistry) {
            return assetRegistry.updateAll([gdata.user.owns, gdata.belongs_to.owns])
        })

}