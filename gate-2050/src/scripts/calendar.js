document.addEventListener('DOMContentLoaded', () => {
    const calendarEl = document.getElementById('calendar');
    const addBlockBtn = document.getElementById('add-block');
    let timeBlocks = [];

    // Initialize calendar with days of the week
    function initCalendar() {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        days.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.className = 'bg-gray-800 p-4 rounded-lg';
            dayEl.innerHTML = `
                <h3 class="text-xl font-bold text-center text-white mb-2">${day}</h3>
                <div id="${day.toLowerCase()}-blocks" class="space-y-2"></div>
            `;
            calendarEl.appendChild(dayEl);
        });
    }

    // Load time blocks from database
    async function loadTimeBlocks() {
        try {
            timeBlocks = await window.electronAPI.getTimeBlocks();
            renderTimeBlocks();
        } catch (error) {
            console.error('Error loading time blocks:', error);
        }
    }

    // Render time blocks to the calendar
    function renderTimeBlocks() {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        days.forEach(day => {
            const dayBlocksEl = document.getElementById(`${day}-blocks`);
            dayBlocksEl.innerHTML = '';
            
            const dayBlocks = timeBlocks.filter(block => block.day === day);
            dayBlocks.forEach(block => {
                const blockEl = document.createElement('div');
                blockEl.className = 'bg-gray-700 p-2 rounded flex justify-between items-center';
                blockEl.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="${block.is_locked ? 'text-green-400' : ''}">${block.startTime} - ${block.endTime}</span>
                            <span class="block ${block.is_locked ? 'text-green-300' : ''}">${block.activity}</span>
                        </div>
                        <div class="flex items-center">
                            ${block.is_locked ? 
                                `<span class="text-xs bg-green-800 text-green-200 px-2 py-1 rounded mr-2">
                                    <i class="fas fa-lock mr-1"></i> Locked
                                </span>` : ''
                            }
                            <button class="edit-block text-yellow-400 hover:text-yellow-300 mr-2" data-id="${block.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-block text-red-400 hover:text-red-300" data-id="${block.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                dayBlocksEl.appendChild(blockEl);
            });
        });
    }

    // Validate time range
    function validateTimeRange(startTime, endTime) {
        return new Date(`1970-01-01T${endTime}`) > new Date(`1970-01-01T${startTime}`);
    }

    // Show time block modal
    function showTimeBlockModal(block = null) {
        const modal = document.getElementById('time-block-modal');
        const form = document.getElementById('time-block-form');
        const title = document.getElementById('modal-title');
        
        if (block) {
            title.textContent = 'Edit Time Block';
            document.getElementById('block-id').value = block.id;
            document.getElementById('block-day').value = block.day;
            document.getElementById('block-start').value = block.startTime;
            document.getElementById('block-end').value = block.endTime;
            document.getElementById('block-activity').value = block.activity;
        } else {
            title.textContent = 'Add Time Block';
            form.reset();
        }
        
        modal.classList.remove('hidden');
    }

    function closeTimeBlockModal() {
        document.getElementById('time-block-modal').classList.add('hidden');
    }

    // Handle form submission
    document.getElementById('time-block-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const block = {
            id: document.getElementById('block-id').value,
            day: document.getElementById('block-day').value,
            startTime: document.getElementById('block-start').value,
            endTime: document.getElementById('block-end').value,
            activity: document.getElementById('block-activity').value
        };

        // Validate time range
        if (!validateTimeRange(block.startTime, block.endTime)) {
            alert('End time must be after start time');
            return;
        }

        try {
            if (block.id) {
                await window.electronAPI.updateTimeBlock(block);
            } else {
                await window.electronAPI.addTimeBlock(block);
            }
            closeTimeBlockModal();
            loadTimeBlocks();
        } catch (error) {
            console.error('Error saving time block:', error);
            alert('Failed to save time block');
        }
    });

    // Handle cancel button
    document.getElementById('cancel-block').addEventListener('click', closeTimeBlockModal);

    // Handle edit/delete buttons (delegated)
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-block')) {
            const blockId = e.target.dataset.id;
            const block = timeBlocks.find(b => b.id === parseInt(blockId));
            if (block) showTimeBlockModal(block);
        }
        
        if (e.target.classList.contains('delete-block')) {
            if (confirm('Are you sure you want to delete this time block?')) {
                try {
                    await window.electronAPI.deleteTimeBlock(e.target.dataset.id);
                    loadTimeBlocks();
                } catch (error) {
                    console.error('Error deleting time block:', error);
                    alert('Failed to delete time block');
                }
            }
        }
    });

    // Initialize
    initCalendar();
    loadTimeBlocks();
});