let readyStatus = document.querySelector('#readyStatus')
let notReadyStatus = document.querySelector('#notReadyStatus')
let myForm = document.querySelector('#myForm')
let contentArea = document.querySelector('#contentArea')
let formDialog = document.querySelector('#formDialog')
let detailDialog = document.querySelector('#detailDialog')
let createButton = document.querySelector('#createButton')
let saveButton = document.querySelector('#saveButton')
let cancelButton = document.querySelector('#cancelButton')
let formHeading = document.querySelector('.modal-header h2')

const MAX_SLOTS = 12 // Total number of frame slots on the altar

// Get form data and process each type of input
// Prepare the data as JSON with a proper set of types
// e.g. Booleans, Numbers, Dates
const getFormData = () => {
    // FormData gives a baseline representation of the form
    // with all fields represented as strings
    const formData = new FormData(myForm)
    const json = Object.fromEntries(formData)

    // Handle checkboxes, dates, and numbers
    myForm.querySelectorAll('input').forEach(el => {
        const value = json[el.name]
        const isEmpty = !value || value.trim() === ''

        // Represent checkboxes as a Boolean value (true/false)
        if (el.type === 'checkbox') {
            json[el.name] = el.checked
        }
        // Represent number and range inputs as actual numbers
        else if (el.type === 'number' || el.type === 'range') {
            json[el.name] = isEmpty ? null : Number(value)
        }
        // Represent all date inputs in ISO-8601 DateTime format
        else if (el.type === 'date') {
            json[el.name] = isEmpty ? null : new Date(value).toISOString()
        }
    })
    return json
}

// Listen for form submissions  
myForm.addEventListener('submit', async event => {
    // prevent the page from reloading when the form is submitted.
    event.preventDefault()
    const data = getFormData()
    await saveItem(data)
    myForm.reset()
    formDialog.close()
})

// Open dialog when create button clicked
createButton.addEventListener('click', () => {
    myForm.reset()
    formHeading.textContent = 'Add someone to the ofrenda'
    formDialog.showModal()
})

// Close dialog when cancel button clicked
cancelButton.addEventListener('click', () => {
    formDialog.close()
})

// Save button submits the form
saveButton.addEventListener('click', () => {
    myForm.requestSubmit()
})

// Save item (Create or Update)
const saveItem = async (data) => {
    console.log('Saving:', data)

    // Determine if this is an update or create
    const endpoint = data.id ? `/data/${data.id}` : '/data'
    const method = data.id ? "PUT" : "POST"

    const options = {
        method: method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }

    try {
        const response = await fetch(endpoint, options)

        if (!response.ok) {
            try {
                const errorData = await response.json()
                console.error('Error:', errorData)
                alert(errorData.error || response.statusText)
            }
            catch (err) {
                console.error(response.statusText)
                alert('Failed to save: ' + response.statusText)
            }
            return
        }

        const result = await response.json()
        console.log('Saved:', result)

        // Refresh the data list
        getData()
    }
    catch (err) {
        console.error('Save error:', err)
        alert('An error occurred while saving')
    }
}

// Edit item - populate form with existing data
const editItem = (data) => {
    console.log('Editing:', data)

    // Populate the form with data to be edited
    Object.keys(data).forEach(field => {
        const element = myForm.elements[field]
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = data[field]
            } else if (element.type === 'date') {
                // Extract yyyy-mm-dd from ISO date string (avoids timezone issues)
                element.value = data[field] ? data[field].substring(0, 10) : ''
            } else {
                element.value = data[field]
            }
        }
    })

    // Update image preview if image exists
    const imagePreview = document.querySelector('#imagePreview')
    if (data.imageUrl) {
        imagePreview.setAttribute('src', data.imageUrl)
    } else {
        imagePreview.setAttribute('src', 'assets/photo.svg')
    }

    // Update remove button visibility (requires upload.js to be loaded)
    if (typeof updateButtonVisibility === 'function') {
        updateButtonVisibility()
    }

    // Update the heading to indicate edit mode
    formHeading.textContent = 'Edit Ofrenda Entry'

    // Show the dialog
    formDialog.showModal()
}

// Delete item
const deleteItem = async (id) => {
    if (!confirm('Are you sure you want to remove this person from the ofrenda?')) {
        return
    }

    const endpoint = `/data/${id}`
    const options = { method: "DELETE" }

    try {
        const response = await fetch(endpoint, options)

        if (response.ok) {
            const result = await response.json()
            console.log('Deleted:', result)
            // Refresh the data list
            getData()
        }
        else {
            const errorData = await response.json()
            alert(errorData.error || 'Failed to delete item')
        }
    } catch (error) {
        console.error('Delete error:', error)
        alert('An error occurred while deleting')
    }
}

// Show detail view for a filled frame
const showDetail = (item) => {
    const detailContent = document.querySelector('#detailContent')
    
    const birthDate = item.birthDate ? new Date(item.birthDate).toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric',
        timeZone: 'UTC'
    }) : '?'
    
    const deathDate = item.deathDate ? new Date(item.deathDate).toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric',
        timeZone: 'UTC'
    }) : '?'
    
    const template = /*html*/`
        <button class="detail-close" id="detailCloseBtn">×</button>
        <div class="detail-image-frame">
            <img src="${item.imageUrl || 'assets/skull.svg'}" alt="${item.name}" />
        </div>
        <h2 class="detail-name">${item.name} ${item.lastName || ''}</h2>
        <p class="detail-dates">${birthDate} - ${deathDate}</p>
        <p class="detail-description">${item.description || ''}</p>
        <div class="detail-actions">
            <button class="detail-edit-btn" id="detailEditBtn">Edit</button>
            <button class="detail-delete-btn" id="detailDeleteBtn">Delete</button>
        </div>
    `
    
    detailContent.innerHTML = DOMPurify.sanitize(template)
    
    // Add close button event listener
    document.querySelector('#detailCloseBtn').addEventListener('click', () => {
        detailDialog.close()
    })
    
    // Add edit button event listener
    document.querySelector('#detailEditBtn').addEventListener('click', () => {
        detailDialog.close()
        editItem(item)
    })
    
    // Add delete button event listener
    document.querySelector('#detailDeleteBtn').addEventListener('click', () => {
        detailDialog.close()
        deleteItem(item.id)
    })
    
    detailDialog.showModal()
}

// Render the altar with all frames
const renderAltar = (items) => {
    const altarDiv = document.createElement('div')
    altarDiv.classList.add('ofrenda-altar')

    // Create all 12 frame slots (these go BEHIND the altar)
    for (let i = 0; i < MAX_SLOTS; i++) {
        const frameSlot = document.createElement('div')
        frameSlot.classList.add('frame-slot')
        
        if (items[i]) {
            // Slot has data - show the image or placeholder
            const img = document.createElement('img')
            img.src = items[i].imageUrl || 'assets/skull.svg'
            img.alt = items[i].name ? `${items[i].name} ${items[i].lastName || ''}` : 'Memorial'
            frameSlot.appendChild(img)
            
            // Add click handler to show detail view
            frameSlot.addEventListener('click', () => showDetail(items[i]))
            
            // Add hover tooltip with name
            if (items[i].name) {
                frameSlot.title = `${items[i].name} ${items[i].lastName || ''}`
            }
        } else {
            // Empty slot - show placeholder skull
            const img = document.createElement('img')
            img.src = 'assets/skull.svg'
            img.alt = 'Empty frame'
            img.style.opacity = '0.3'
            frameSlot.appendChild(img)
            frameSlot.classList.add('empty')
            
            // Add click handler to create new entry
            frameSlot.addEventListener('click', () => {
                myForm.reset()
                formHeading.textContent = 'Add someone to the ofrenda'
                formDialog.showModal()
            })
        }
        
        altarDiv.appendChild(frameSlot)
    }

    // Create the altar background overlay (this goes ON TOP of the frames)
    const altarBackground = document.createElement('div')
    altarBackground.classList.add('altar-background')
    altarBackground.style.backgroundImage = 'url(assets/altar.svg)'
    altarDiv.appendChild(altarBackground)

    return altarDiv
}

// Fetch items from API endpoint and populate the altar
const getData = async () => {
    try {
        const response = await fetch('/data')

        if (response.ok) {
            readyStatus.style.display = 'block'
            notReadyStatus.style.display = 'none'

            const data = await response.json()
            console.log('Fetched data:', data)

            // Clear and render the altar
            contentArea.innerHTML = ''
            const altar = renderAltar(data)
            contentArea.appendChild(altar)
        }
        else {
            // If the request failed, show the "not ready" status
            // to inform users that there may be a database connection issue
            notReadyStatus.style.display = 'block'
            readyStatus.style.display = 'none'
            createButton.style.display = 'none'
            contentArea.style.display = 'none'
        }
    } catch (error) {
        console.error('Error fetching data:', error)
        notReadyStatus.style.display = 'block'
    }
}

// Revert to the default form title on reset
myForm.addEventListener('reset', () => {
    formHeading.textContent = 'Add someone to the ofrenda'
    // Reset image preview
    const imagePreview = document.querySelector('#imagePreview')
    if (imagePreview) {
        imagePreview.setAttribute('src', 'assets/photo.svg')
    }
    // Update remove button visibility
    if (typeof updateButtonVisibility === 'function') {
        updateButtonVisibility()
    }
})

// Reset the form when the create button is clicked. 
createButton.addEventListener('click', () => {
    myForm.reset()
})

// Load initial data
getData()