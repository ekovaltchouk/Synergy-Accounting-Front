import React, {useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useCsrf} from '../utilities/CsrfContext';
import {useUser} from '../utilities/UserContext';
import Logo from "../assets/synergylogo.png";
import {Account, AccountCategory, AccountType, MessageResponse, Transaction} from "../Types";
import RightDashboard from "./RightDashboard";
import trashCanIcon from "../assets/trashcan.png";

const ChartOfAccounts: React.FC = () => {

    const navigate = useNavigate();
    const location = useLocation();

    const { csrfToken } = useCsrf();
    const { user: loggedInUser, fetchUser } = useUser();

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [selectedTransactions, setSelectedTransactions] = useState<Transaction[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<Account[]>([]);


    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            if (!loggedInUser) {
                await fetchUser();
            }
            setIsLoading(false);
        };
        init().then();
    }, [loggedInUser, fetchUser]);

    useEffect(() => {
        if (!isLoading && (!loggedInUser || loggedInUser.userType === "DEFAULT")) {
            navigate('/login');
        } else {
            getAccounts().then();
        }
    }, [loggedInUser, isLoading, navigate]);

    const getAccounts = async () => {
        if (!csrfToken) {
            console.error('CSRF token is not available.');
            return;
        }
        try {
            const response = await fetch(`https://synergyaccounting.app/api/accounts/chart-of-accounts`, {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': csrfToken
                },
                credentials: 'include'
            });

            if (response.ok) {
                const accounts: Account[] = await response.json();
                setAccounts(accounts);

                if (location.state && location.state.selectedAccount) {
                    await handleAccountClick(location.state.selectedAccount);
                }

            } else if (response.status === 403) {
                alert('You do not have permission to access this resource.');
                navigate('/dashboard');
                return;
            } else {
                const message: MessageResponse = await response.json();
                alert(message);
                navigate('/dashboard');
                return;
            }
        } catch (error) {
            alert('An error has occurred. Please try again! Please try again.');
            navigate('/dashboard');
        }
    };

    const handleChange = async (transaction: Transaction, isChecked: boolean) => {
        if (transactions) {
            if (isChecked) {
                setSelectedTransactions(prev => [...prev, transaction]);
            } else {
                setSelectedTransactions(prev => prev.filter(id => id !== transaction));
            }
        }
    }

    const handleAccountChange = async (account: Account, isChecked: boolean) => {
        if (transactions) {
            if (isChecked) {
                setSelectedAccounts(prev => [...prev, account]);
            } else {
                setSelectedAccounts(prev => prev.filter(id => id !== account));
            }
        }
    }

    const handleSort = (key: keyof Account | 'statementType') => {
        const sortedAccounts = [...accounts].sort((a, b) => {
            if (key === 'statementType') {
                const statementTypeA = getStatementType(a.accountCategory);
                const statementTypeB = getStatementType(b.accountCategory);

                if (statementTypeA < statementTypeB) {
                    return -1;
                }
                if (statementTypeA > statementTypeB) {
                    return 1;
                }
                return 0;
            }
            if (a[key] < b[key]) {
                return -1;
            }
            if (a[key] > b[key]) {
                return 1;
            }
            return 0;
        });
        setAccounts(sortedAccounts);
    };
    const handleAccountClick = async (account: Account) => {
        if (!csrfToken) {
            console.error('CSRF token is not available.');
            return;
        }
        setSelectedAccount(account);
        const response = await fetch(`/api/accounts/chart-of-accounts/${account.accountNumber}`, {
            method: 'GET',
            headers: {
                'X-CSRF-TOKEN': csrfToken
            },
            credentials: 'include'
        });

        if (response.ok) {
            const transactions: Transaction[] = await response.json();
            console.log(transactions);
            setTransactions(transactions);
        } else {
            alert('Failed to fetch transactions.');
        }
    };

    const handleDeleteTransactions = async () => {
        if (!csrfToken) {
            console.error('CSRF token is not available.');
            return;
        }

        try {
            const response = await fetch('https://synergyaccounting.app/api/accounts/chart-of-accounts/delete-transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify(selectedTransactions)
            });

            if (response.status === 403) {
                alert('You do not have permission to delete these transactions.');
                return;
            }
            const responseMsg: MessageResponse = await response.json();
            alert(responseMsg.message)
            if (!(response.status === 204) && transactions && selectedTransactions) {
                if (response.ok) {
                    setTransactions(transactions.filter(transaction => !selectedTransactions.includes(transaction)));
                    setSelectedTransactions([]);
                    getAccounts().then();
                }
            }

        } catch (error) {
            alert('An error occurred while deleting transactions.');
            console.log(error);
        }
    };

    const handleDeactivateAccounts = async () => {
        if (!csrfToken) {
            console.error('CSRF token is not available.');
            return;
        }
        for (let a of selectedAccounts) {
            if (a.currentBalance !== 0) {
                alert("You cannot deactivate an account with a standing balance.");
                return;
            }
        }
        try {
            const response = await fetch('https://synergyaccounting.app/api/accounts/chart-of-accounts/deactivate-accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify(selectedAccounts)
            });

            if (response.status === 403) {
                alert('You do not have permission to deactivate these accounts.');
                return;
            }
            const responseMsg: MessageResponse = await response.json();
            alert(responseMsg.message)
            if (!(response.status === 204) && transactions && selectedTransactions) {
                if (response.ok) {
                    setAccounts(accounts.filter(account => !selectedAccounts.includes(account)));
                    setSelectedAccounts([]);
                    getAccounts().then();
                }
            }

        } catch (error) {
            alert('An error occurred while deactivating accounts.');
            console.log(error);
        }
    };

    const handleGoBack = () => {
        setSelectedAccount(null);
        setTransactions([]);
    };

    const getStatementType = (accountCategory: AccountCategory): string => {
        switch (accountCategory) {
            case AccountCategory.ASSET:
            case AccountCategory.LIABILITY:
            case AccountCategory.EQUITY:
                return 'Balance Sheet (BS)';
            case AccountCategory.REVENUE:
            case AccountCategory.EXPENSE:
                return 'Income Statement (IS)';
            default:
                return 'Retained Earnings (RE)';
        }
    };

    if (isLoading || !csrfToken) {
        return <div>Loading...</div>;
    }

    return (
        <div className="dashboard" style={{height: "auto", minHeight: "100vh"}}>
            <RightDashboard />
            <img src={Logo} alt="Synergy" className="dashboard-logo"/>
            <div className="dashboard-center" style={{top: "unset", justifyContent: "unset"}}>
                <div className="chart-container">
                    {selectedAccount === null ? <>
                        <label className="center-text" style={{fontSize: "5vmin", marginBottom: "2vmin"}}>Chart of
                            Accounts</label>
                        <button style={{right: "unset", left: "5vmin"}} onClick={() => handleDeactivateAccounts()}
                                className="control-button add-account-button">Deactivate Selected Account
                        </button>
                        <button
                            onClick={() => navigate('/dashboard/chart-of-accounts/add',
                                {state: {selectedAccount}})}
                            className="control-button add-account-button">
                            +
                        </button>
                        <table id="chartOfAccountsTable">
                            <thead>
                            <tr>
                                <th style={{width: 'min-content'}}>Select</th>
                                <th onClick={() => handleSort('accountNumber')}>Account Number</th>
                                <th onClick={() => handleSort('accountName')}>Account Name</th>
                                <th onClick={() => handleSort('accountDescription')}>Account Description</th>
                                <th onClick={() => handleSort('normalSide')}>Normal Side</th>
                                <th onClick={() => handleSort('accountCategory')}>Category</th>
                                <th onClick={() => handleSort('accountSubCategory')}>Subcategory</th>
                                <th onClick={() => handleSort('currentBalance')}>Current Balance</th>
                                <th onClick={() => handleSort('dateAdded')}>Date Added</th>
                                <th onClick={() => handleSort('statementType')}>Statement Type</th>
                                <th onClick={() => handleSort('username')}>Creator</th>
                            </tr>
                            </thead>
                            <tbody>
                            {accounts.map((account) => {
                                const currentBalance = account.normalSide === AccountType.DEBIT
                                    ? account.debitBalance - account.creditBalance
                                    : account.creditBalance - account.debitBalance;
                                const statementType = getStatementType(account.accountCategory);
                                return (
                                    <tr key={account.accountNumber} onClick={() => handleAccountClick(account)}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) =>
                                                    handleAccountChange(account, e.target.checked)
                                                }
                                            />
                                        </td>
                                        <td>{account.accountNumber}</td>
                                        <td>{account.accountName}</td>
                                        <td>{account.accountDescription}</td>
                                        <td>{account.normalSide}</td>
                                        <td>{account.accountCategory}</td>
                                        <td>{account.accountSubCategory}</td>
                                        <td>{currentBalance.toFixed(2)}</td>
                                        <td>{new Date(account.dateAdded).toLocaleDateString()}</td>
                                        <td>{statementType}</td>
                                        <td>{account.username}</td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </> : <>
                        <label className="center-text" style={{fontSize: "5vmin", marginBottom: "2vmin"}}>
                            Account Ledger:<br/>
                            {selectedAccount.accountName}</label>
                        <button style={{right: "unset", left: "5vmin"}} onClick={() => handleGoBack()}
                                className="control-button add-account-button">Go Back
                        </button>
                        <div className="button-container">
                            <button onClick={handleDeleteTransactions}
                                    className="control-button transaction-button"
                                    disabled={selectedTransactions.length === 0}>
                                <img src={trashCanIcon} alt="Delete" style={{width: '20px', height: '20px'}}/>
                            </button>
                            <button
                                onClick={() => navigate('/dashboard/chart-of-accounts/add-transaction',
                                    {state: {selectedAccount}})}
                                style={{aspectRatio: "1/1", width: "2rem"}}
                                className="control-button transaction-button">
                                +
                            </button>
                        </div>
                        <table id="transactionTable">
                            <thead>
                            <tr>
                                <th style={{width: 'min-content'}}>Select</th>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Debit</th>
                                <th>Credit</th>
                                <th>Balance</th>
                            </tr>
                            </thead>
                            <tbody>
                            {(() => {
                                let runningBalance = selectedAccount.initialBalance;
                                return transactions.map((transaction) => {
                                    if (transaction.transactionType === "DEBIT") {
                                        runningBalance += transaction.transactionAmount;
                                    } else {
                                        runningBalance -= transaction.transactionAmount;
                                    }
                                    return (
                                        <tr key={transaction.transactionId} onClick={() =>
                                            navigate('/dashboard/chart-of-accounts/update-transaction', {state: {transaction}})}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) =>
                                                        handleChange(transaction, e.target.checked)
                                                    }
                                                />
                                            </td>
                                            <td>{new Date(transaction?.transactionDate).toLocaleDateString()}</td>
                                            <td>{transaction.transactionDescription}</td>
                                            <td>{transaction.transactionType === "DEBIT" ? transaction.transactionAmount.toFixed(2) : ''}</td>
                                            <td>{transaction.transactionType === "CREDIT" ? transaction.transactionAmount.toFixed(2) : ''}</td>
                                            <td>{runningBalance.toFixed(2)}</td>
                                        </tr>
                                    );
                                });
                            })()}
                            </tbody>
                        </table>
                    </>}
                </div>
            </div>
        </div>
    );
};

export default ChartOfAccounts;
