"use strict";

const filesInput = document.getElementById('filesInput');
const newTitleInput = document.getElementById('newTitleInput');
const newArtistInput = document.getElementById('newArtistInput');
//const newRomanisedTitleInput = document.getElementById('newRomanisedTitleInput');
//const newRomanisedArtistInput = document.getElementById('newRomanisedArtistInput');
const diffnameFormatInput = document.getElementById('diffnameFormatInput');
const formatExample = document.getElementById('formatExample');
//const useUnromanisedCheckbox = document.getElementById('useUnromanisedCheckbox');
const clearMapIdsCheckbox = document.getElementById('clearMapIdsCheckbox');
const updateMapsButton = document.getElementById('updateMapsButton');
const output = document.getElementById('output');

// Enable button if all fields are populated
function updateButtonState() {
    updateMapsButton.disabled = !(
        filesInput.files.length > 0 &&
        newArtistInput.value &&
        newTitleInput.value &&
        diffnameFormatInput.value
    );
}

// Update example to show format. Button state update will happen in all cases, so include it
function updateExampleAndButtonState() {
    // Add map name if both fields are full
    const mapName = newArtistInput.value && newTitleInput.value ? `${newArtistInput.value} - ${newTitleInput.value} ` : ''

    // Format the example
    formatExample.innerHTML = `<b>Example:</b> ${mapName}[` + diffnameFormatInput.value
        .replace(/{artist}/g, "Inabakumori")
        .replace(/{title}/g, "Haru no Sekibaku")
        .replace(/{difficulty}/g, "Normal")
        + "]";
    updateButtonState();
}


let files = {};

filesInput.addEventListener('change', () => {
    files = Array.from(filesInput.files);
    updateButtonState();
});

newArtistInput.addEventListener('input', updateExampleAndButtonState);
newTitleInput.addEventListener('input', updateExampleAndButtonState);
diffnameFormatInput.addEventListener('input', updateExampleAndButtonState);

updateMapsButton.addEventListener('click', async () => {
    const zip = new JSZip();

    const filePromises = Array.from(files).map(async (file) => {
        const content = await file.text();

        // Define regex patterns for different fields
        const artistRegex = /^Artist:(.*)$/m;
        const titleRegex = /^Title:(.*)$/m;
        const diffnameRegex = /^Version:(.*)$/m;
        const mapperRegex = /^Creator:(.*)$/m;

        // Search for matches using regex
        const artistMatch = content.match(artistRegex);
        const titleMatch = content.match(titleRegex);
        const diffnameMatch = content.match(diffnameRegex);
        const mapperMatch = content.match(mapperRegex);

        if (!artistMatch || !titleMatch || !diffnameMatch || !mapperMatch) {
            console.warn(`Skipping file due to invalid metadata: ${file.name}`);
            return; // Skip to the next file
        }

        // Extract values from matches
        const artist = artistMatch[1];
        const title = titleMatch[1];
        const diffname = diffnameMatch[1];
        const mapper = mapperMatch[1];

        // Generate the new diffname
        const newDiffname = diffnameFormatInput.value
            .replace(/{artist}/g, artist)
            .replace(/{title}/g, title)
            .replace(/{difficulty}/g, diffname);

        // Replace values in the content
        let modifiedContent = content
            .replace(artistRegex, `Artist:${newArtistInput.value}`)
            .replace(titleRegex, `Title:${newTitleInput.value}`)
            .replace(diffnameRegex, `Version:${newDiffname}`)
        
        // Remove unicode artist and title, support TODO
        modifiedContent = modifiedContent
            .replace(/^ArtistUnicode:.*\r?\n/m, '')
            .replace(/^TitleUnicode:.*\r?\n/m, '')

        // Remove source
        modifiedContent = modifiedContent
            .replace(/^Source:.*$/m, 'Source:');
        
        // Remove map ids if checkbox checked
        if (clearMapIdsCheckbox.checked) {
            modifiedContent = modifiedContent
                .replace(/^BeatmapID:\d+$/m, 'BeatmapID:0')
                .replace(/^BeatmapSetID:\d+$/m, 'BeatmapSetID:-1');
        }

        // Generate new filename to match updated map properties
        const newFileName = `${newArtistInput.value} - ${newTitleInput.value} (${mapper}) [${newDiffname}].osu`.replace(/[\\\/\:\*\?\"\<\>\|]/g, '')

        // Add the modified content as a file in the zip, compression is not needed
        zip.file(newFileName, modifiedContent, { compression: 'STORE' });
    });

    // Wait for all promises to complete
    await Promise.all(filePromises);

    // Download the zip
    zip.generateAsync({ type: 'blob' })
        .then(function (content) {
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${newArtistInput.value} - ${newTitleInput.value}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
});
