'use strict';

var app = angular.module( 'application', ['chart.js', 'firebase']);
var urlJson = 'http://localhost:1337/webtask.future-processing.com:8068/currencies';  //https://github.com/gr2m/CORS-Proxy | npm install -g corsproxy  | start proxy: corsproxy

app.controller( 'currencyController', [ '$scope', '$filter','$http','$firebaseObject', '$firebaseAuth',"$firebaseArray", function( $scope, $filter, $http, $firebaseObject, $firebaseAuth, $firebaseArray ) {

    const firebaseConfig = {
        apiKey: "AIzaSyCXnXGjGh0arYmnjVBy7sp9uQj9s53M0kc",
        authDomain: "currencyexchange-c7230.firebaseapp.com",
        databaseURL: "https://currencyexchange-c7230.firebaseio.com",
        projectId: "currencyexchange-c7230",
        storageBucket: "currencyexchange-c7230.appspot.com",
        messagingSenderId: "327146176429"
    }

    const firebaseApp = firebase.initializeApp(firebaseConfig)

    // User is still logged - confirmation
    firebaseApp.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in.
            let displayName = user.displayName;
            $scope.userEmail = user.email;
            let emailVerified = user.emailVerified;
            let photoURL = user.photoURL;
            let isAnonymous = user.isAnonymous;
            let uid = user.uid;
            let providerData = user.providerData;
            console.log(uid);
        } else {
            // User is signed out.
            console.log('Please signe in');
        }
    })

    // Download data from the user's currency database and write to the variable
    let userCurrencyDatabase = (userUid) => {
        let ref = firebase.database().ref('users/' + userUid);

        ref.once('value', curr => {
            $scope.currencyUsers = curr.val()

            curr.forEach((item) => {
                console.log('Content database: ', item.val())
            })
        })
    }

    // SigIn function
    $scope.userLogIn = () => {
        firebase.auth()
            .signInWithEmailAndPassword(
                $scope.loginValue,
                $scope.passwordValue )
            .then( info => {
                let uid = firebase.auth().currentUser.uid;
                userCurrencyDatabase( uid );
                $scope.showUserTable = true;   // log off false
                $scope.showUserName = true;
            })
            .catch( error => {
            // Handle Errors here.
            let errorCode = error.code;
            let errorMessage = error.message;
            console.log(errorCode);
            console.log(errorMessage);
        });
    }

//Show user name in menu bar
//     $scope.userName = () => {
//         console.log(firebase.auth().currentUser.providerData[0].uid)
//         $scope.userEmail = firebase.auth().currentUser.providerData[0].uid
//     };


    // SignOut the user
    $scope.signOut = () => {
        firebase.auth()
            .signOut()
            .then( () => {
            console.log('Signed Out');
                $scope.showUserTable = false;   // log off false
                $scope.showUserName = false;
        }, error => {
            console.error('Sign Out Error', error);
        });
    }


    // Buy Carrencies, to do: create an object to send according to the purchase choice
    $scope.buyCurrencies = (userUid) => {

        // test   isG9eWgvi3ZM46ZAIa1XTEfmQb43

        let ref = firebase.database().ref('users/isG9eWgvi3ZM46ZAIa1XTEfmQb43');
        ref.update(
            {
                'USD':{
                    'currency': 'EUR',   // $scope.currencyValue
                    'amount': 100,       // $scope.amountValue
                    'price': 3.05
                },
                'EUR':{
                    'currency':'EUR',
                    'amount': 10,
                    'price': 4.05
                },
                'CHF':{
                    'currency':'CHF',
                    'amount': 1,
                    'price': 5.05
                },
                'RUB':{
                    'currency':'RUB',
                    'amount': 10,
                    'price': 1.05
                },
                'CZK':{
                    'currency':'CZK',
                    'amount': 2,
                    'price': 0.05
                },
                'GBP':{
                    'currency':'GBP',
                    'amount': 50,
                    'price': 7.05
                },
                'avalivblePLN':{
                    'pln': 1500,
                }
            }).then(data => {
            console.log('Data has been sent to the database');
        }, error => {
            console.error('Please sign in to send data');
        } )
    }

/////////////////////////////////////////////////////////////////////////////
    // JSON GET request
    $scope.jsonLoad = () => {
         $http.get( urlJson )
          .then( currencies => {
              $scope.currencies = currencies.data;
              // console.log($scope.currencies = currencies.data);
              // console.log('json - ok');

              // Show information on how to display the currency chart
              $scope.icon = 'img/glyphicons-41-stats.png';
              $scope.currendyInfo = 'To display the chart, use the icon ' ;
          },
          ( error ) => { console.log( error.data.message );
                // Called asynchronously if an error occurs or server returns response with an error status.
          })
    };
    $scope.jsonLoad();

    // 3.89 value
    $scope.formatNumber = i =>  Math.round( i * 100 ) / 100;

    // Currency date from FP
    let currencyDate = () => {
        return $scope.currencies.publicationDate.split('T', 2)[0];
    }

    // date for NBP api
    let nbpDate = () => {
        let date = new Date(),
            currentDd = date.getDate() - 1,       // The currency of today is loaded from Future Processing
            dd        = date.getDate() - 20,      // (currency of 20 previous days)
            mm        = date.getMonth() + 1,      // January is 0
            yyyy      = date.getFullYear();

        currentDd < 10 ? currentDd = '0' + currentDd :'';
        dd < 10 ? dd = '0' + dd :'';
        mm < 10 ? mm = '0' + mm :'';

        date = yyyy + '-' + mm +'-' + dd + '/' + yyyy + '-' + mm +'-' + currentDd;  // Necessary to download the currency rate from NBP
        return date;
    }

    $scope.currencyChart = currChartData => {

        // Function retrieving currency rate from NBP (20 days) and today's date from FP. The data used to display a chart
        let switchChart = ( currCode, num ) => {

            // Clear the array for new chart data
            $scope.labels = []
            $scope.series = []
            $scope.data = [[]]

            //Show the currency for which the graph is generated
            $scope.currendyInfo = 'Chart for: ' + currCode;

            // Historical currency data from NBP API
            $http.get('http://api.nbp.pl/api/exchangerates/rates/A/' + currCode + '/'+ nbpDate())
                .then( currenciesNBP => {
                    currenciesNBP.data.rates.forEach( nbpRates => {
                        $scope.data[0].push( nbpRates.mid * $scope.currencies.items[num].unit )
                        $scope.labels.push( nbpRates.effectiveDate )                             // Add the date to the currency rate (chart)
                })
                    $scope.data[0].push( $scope.currencies.items[num].purchasePrice )           // Add current course (FP) (chart)
                    $scope.labels.push( currencyDate() )                                        // Add date (FP) (chart)
                    $scope.series.push( currCode )                                              // Add current code (FP) (chart)
                },
                ( error ) => { console.log( error )
                    // Called asynchronously if an error occurs or server returns response with an error status.
                }
            );
        }

        // Click on the icon to see the corresponding graph
        switch (currChartData.code){
            case 'USD':
                switchChart('USD', 0);
                break;
            case 'EUR':
                switchChart('EUR', 1);
                break;
            case 'CHF':
                switchChart('CHF', 2);
                break;
            case 'RUB':
                switchChart('RUB', 3);
                break;
            case 'CZK':
                switchChart('CZK', 4);
                break;
            case 'GBP':
                switchChart('GBP', 5);
                break;
        }
    }

    // Currency chart data: http://jtblin.github.io/angular-chart.js/
    $scope.labels = [];
    $scope.series = [];
    $scope.data = [[]];

    $scope.datasetOverride = [{ yAxisID: 'y-axis-1' }, { yAxisID: 'y-axis-2' }];
    $scope.options = {
        scales: {
            yAxes: [
                {
                    id: 'y-axis-1',
                    type: 'linear',
                    display: true,
                    position: 'left'
                },
                {
                    id: 'y-axis-2',
                    type: 'linear',
                    display: true,
                    position: 'right'
                }
            ]
        }
    };
}]);