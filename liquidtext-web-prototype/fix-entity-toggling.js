// Fix entity checkbox toggling and dossier update
document.addEventListener('DOMContentLoaded', function() {
    // Find all entity type checkboxes
    const entityCheckboxes = [
        document.getElementById('highlight-people'),
        document.getElementById('highlight-places'),
        document.getElementById('highlight-organizations'),
        document.getElementById('highlight-dates')
    ];

    // Add improved event listeners
    entityCheckboxes.forEach(checkbox => {
        if (!checkbox) return;

        checkbox.addEventListener('change', function() {
            const entityType = this.id.replace('highlight-', '');

            // Update entity highlights object
            if (entityHighlights[entityType]) {
                entityHighlights[entityType].enabled = this.checked;

                // Add/remove active class to label
                const label = this.parentElement;
                if (this.checked) {
                    label.classList.add('active');
                } else {
                    label.classList.remove('active');
                }

                // Update highlights in all documents
                updateAllDocumentHighlights(entityType, this.checked);

                // Update dossier if it exists
                updateDossierForEntityType(entityType, this.checked);
            }
        });
    });

    // Handle custom entity search
    const searchEntityBtn = document.getElementById('search-entity');
    if (searchEntityBtn) {
        searchEntityBtn.addEventListener('click', function() {
            const customTerm = document.getElementById('custom-entity').value.trim();
            if (customTerm) {
                entityHighlights.custom.term = customTerm;
                entityHighlights.custom.enabled = true;

                // Mark as active
                const customSearchBar = document.querySelector('.search-bar');
                if (customSearchBar) {
                    customSearchBar.classList.add('active');
                }

                startCustomEntitySearch(customTerm);
            }
        });
    }

    // Add custom entity reset button
    addCustomEntityClearButton();
});

// Add clear button for custom entity search
function addCustomEntityClearButton() {
    const searchBar = document.querySelector('.search-bar');
    if (!searchBar) return;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '✕';
    clearBtn.className = 'clear-custom-btn';
    clearBtn.title = 'Clear custom search';
    clearBtn.style.backgroundColor = '#f44336';

    clearBtn.addEventListener('click', function() {
        const customInput = document.getElementById('custom-entity');
        if (customInput) {
            customInput.value = '';
        }

        // Disable custom entity highlighting
        entityHighlights.custom.enabled = false;
        entityHighlights.custom.term = '';

        // Remove active class
        searchBar.classList.remove('active');

        // Update all documents
        updateAllDocumentHighlights('custom', false);

        // Update dossier
        updateDossierForEntityType('custom', false);
    });

    searchBar.appendChild(clearBtn);
}

// Update highlights in all documents for a specific entity type
function updateAllDocumentHighlights(entityType, enabled) {
    // Remove highlights for this entity type from all documents
    document.querySelectorAll(`.entity-${entityType}`).forEach(highlight => {
        highlight.remove();
    });

    // Re-add highlights if enabled
    if (enabled) {
        const matchesForType = allMatches.filter(match => match.entityType === entityType);

        // Group by document and page
        const groupedMatches = {};
        matchesForType.forEach(match => {
            const key = `${match.docIndex}-${match.pageNum}`;
            if (!groupedMatches[key]) {
                groupedMatches[key] = [];
            }
            groupedMatches[key].push(match);
        });

        // For each visible page, add highlights
        Object.keys(groupedMatches).forEach(key => {
            const [docIndex, pageNum] = key.split('-').map(Number);
            const docData = loadedDocuments[docIndex];

            if (docData && docData.currentPage === pageNum) {
                groupedMatches[key].forEach(match => {
                    if (match.position) {
                        highlightMatchWithAnimation(match);
                    }
                });
            }
        });
    }
}

// Update dossier for entity type
function updateDossierForEntityType(entityType, enabled) {
    // Find dossier element
    const dossier = document.querySelector('.dossier-popup');
    if (!dossier) return;

    // Find entity section
    const section = dossier.querySelector(`#${entityType}-section`);
    if (!section) return;

    if (enabled) {
        // Show section
        section.style.display = 'block';
    } else {
        // Hide section
        section.style.display = 'none';
    }

    // If the dossier is visible, refresh it
    if (dossier.classList.contains('visible') && window.compileDossier) {
        window.compileDossier();
    }
}

// Update the DossierBuilder class to handle custom entities properly
const originalDossierCompileEntities = window.DossierBuilder?.prototype?.compileEntities;
if (originalDossierCompileEntities) {
    window.DossierBuilder.prototype.compileEntities = async function() {
        // Call original method
        await originalDossierCompileEntities.call(this);

        // Process custom entities
        if (entityHighlights.custom.enabled && entityHighlights.custom.term) {
            // Create custom entity section if it doesn't exist
            let customSection = this.dossierElement.querySelector('#custom-section');
            if (!customSection) {
                customSection = document.createElement('div');
                customSection.className = 'entity-section';
                customSection.id = 'custom-section';
                customSection.innerHTML = `
                    <h3>Custom Search: "${entityHighlights.custom.term}"</h3>
                    <div class="entity-list"></div>
                `;

                // Insert after dates section
                const datesSection = this.dossierElement.querySelector('#dates-section');
                if (datesSection && datesSection.parentNode) {
                    datesSection.parentNode.insertBefore(customSection, datesSection.nextSibling);
                } else {
                    // If dates section not found, append to results
                    const results = this.dossierElement.querySelector('.dossier-results');
                    if (results) {
                        results.appendChild(customSection);
                    }
                }
            } else {
                // Update title to reflect current search term
                const title = customSection.querySelector('h3');
                if (title) {
                    title.textContent = `Custom Search: "${entityHighlights.custom.term}"`;
                }
            }
            // Update the visibility of the custom section based on search results
            if (entityHighlights.custom.results && entityHighlights.custom.results.length > 0) {
                customSection.style.display = 'block';
            } else {
                customSection.style.display = 'none';
            }

            // Clear previous results in the custom section
            const resultList = customSection.querySelector('.result-list');
            if (resultList) {
                resultList.innerHTML = '';
            }

            // Populate the custom section with new results
            if (entityHighlights.custom.results) {
                entityHighlights.custom.results.forEach(result => {
                    const listItem = document.createElement('li');
                    listItem.textContent = result.name; // Assuming each result has a 'name' property
                    resultList.appendChild(listItem);
                });
            }
        }
    }
}