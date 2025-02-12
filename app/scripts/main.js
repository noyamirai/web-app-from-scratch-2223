import { getCurrentDate } from "./utils.js";
import { fetchData, getApiUrls, handleMissingData, getTeamDetails } from './api.js';
import { displayData } from "./dataHandling.js";
import { saveDataToStorage, checkMissingData, listAllDataFromStorage, getDataFromStorage, getResultKey } from "./storage.js";
import { showPage, setActiveMenu } from './renderUI.js';

document.addEventListener('DOMContentLoaded', async () => {

    let lastUpdated = localStorage.getItem("lastUpdated"); 
    let currentDate = getCurrentDate();

    routie({
        '': function() {
            initialCall('home', lastUpdated, currentDate);
        },
        'home': function() {
            const toFetch = ['league_teams', 'standings', 'prev_games', 'games_today'];

            initialCall('home', lastUpdated, currentDate, toFetch);
        },
        'standings': function() {
            initialCall('standings', lastUpdated, currentDate, 'standings');     
        },
        'team-details/:id': async function(teamId) {
            try {
                const data = await getTeamDetails(teamId, 'team_details');
                displayData('team-details', data);
                
            } catch (error) {
                console.log(error);
                const failScreen = document.querySelector('.failed');
                failScreen.classList.remove('hide');
                // TOOD: error handling
            }
        }
    });

    // TODO: error page

});

function initialCall(target, lastUpdated, currentDate, query = '') {

    // If never been updated -> fetch data
    if (lastUpdated === null) {
        console.log('FETCH DATA AND SET LASTUPDATED KEY TO NOW');

        saveAndDisplayData(target, query, true);

        localStorage.setItem('lastUpdated', currentDate);

    // User has fetched data before
    } else {

        // SOURCE: chat.openai.com/chat
        const lastUpdatedDate = new Date(lastUpdated.split('/').reverse().join('/'));
        currentDate = new Date(currentDate.split('/').reverse().join('/'));

        // Last updated in the past -> fetch new data
        // TODO: fetch on standings every time
        if (currentDate > lastUpdatedDate) {
            console.log('fetched data is outdated!');

            saveAndDisplayData(target, query, true);
            localStorage.setItem('lastUpdated', currentDate);

        // Last updated today -> get data from localstorage
        } else {
            console.log('data is still fresh');
            saveAndDisplayData(target, query, false);
        }
    }
}

/**
 * 
 * @param {string} query what kind of data are you fetching
 * @param {boolean} needsNewData
 */
async function saveAndDisplayData(target, query = '', needsNewData = false) {

    try {

        let result;

        // Prepare for additional team details
        if (query == 'league_teams' || query.includes('league_teams')) {

            if (query == 'league_teams') {
                query = ['league_teams', 'male_team_data'];
            } else {
                query.push('male_team_data'); 
            }
        }

        // Check whether or not it requires brand new data
        if (needsNewData) {
            console.log('NEEDS NEW DATA');
            
            result = await fetchData(query);
            saveDataToStorage(result, query);
            
        // User still has fresh data -> read from localstorage
        } else {
            console.log('GET DATA FROM LOCALSTORAGE');

            let urlData = getApiUrls(query);

            // Save which keys are missing from storage (aka data no longer saved, need new data again)
            let missingData = checkMissingData(urlData);

            urlData = missingData.updatedData;
            missingData = missingData.toFetch;

            const hasUrlData = Object.keys(urlData).length > 0;

            if (hasUrlData) {

                // Get all available data saved in localstorage
                if ((typeof query === 'string' && query == '') || (typeof query != 'string' || Array.isArray(query))) {
                    result = listAllDataFromStorage(urlData);
                    
                // Get specific key data from localstorage
                } else {
                    result = getDataFromStorage(query);
                }
            }

            // Remaining data to fetch (new data)
            if (missingData.length > 0) {
                let newData = await handleMissingData(missingData);
                console.log(newData);

                // if data in localstorage
                if (result && result.length > 0) {

                    // singular call was made
                    if (typeof newData === 'object' && !Array.isArray(newData)) {
                        const resultKey = getResultKey(newData);

                        if (result && result.length > 0) {
                            result.push(newData[resultKey]);
                        }

                    // multiple calls were made
                    } else {
                        newData.forEach(item => {
                            result.push(item);
                        });
                    }
                    
                // nothing from localstorage aka empty result
                } else {
                    result = newData;
                }
            }
        }

        console.log('DATA TO WORK WITH:');
        console.log(result);

        displayData(target, result);
        
    // TODO: error handling
    } catch (error) {
        const failScreen = document.querySelector('.failed');
        failScreen.classList.remove('hide');
        // showPage(target);
        // setActiveMenu(target);

        console.log('WEE WEOO WEE WOO');
        console.log(error);
    }

}
