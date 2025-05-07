document.addEventListener('DOMContentLoaded', () => {
    // Smooth Scroll Navigation with offset (accounting for fixed navbar)
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        const yOffset = -70; // Adjust this value to match your navbar height
        const y = targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      });
    });
  
    // Generate Symptom Input Fields
    document.getElementById('generate-symptoms').addEventListener('click', () => {
      const numSymptoms = parseInt(document.getElementById('num-symptoms').value);
      const symptomContainer = document.getElementById('symptom-inputs');
  
      if (isNaN(numSymptoms) || numSymptoms < 1 || numSymptoms > 10) {
        alert("Please enter a valid number between 1 and 10");
        return;
      }
  
      symptomContainer.innerHTML = '';
      for (let i = 0; i < numSymptoms; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group';
        inputGroup.innerHTML = `
            <input type="text" class="symptom" 
                   placeholder="Symptom ${i + 1}" 
                   list="symptoms${i}"
                   autocomplete="off" required>
            <datalist id="symptoms${i}"></datalist>
        `;
        symptomContainer.appendChild(inputGroup);
      }
  
      document.getElementById('symptom-form').style.display = 'block';
    });
  
    // Suggestion Handling with Debounce
    let timeoutId;
    document.getElementById('symptom-inputs').addEventListener('input', (e) => {
      if (!e.target.matches('.symptom')) return;
  
      clearTimeout(timeoutId);
      const input = e.target;
      const datalist = input.nextElementSibling;
      const query = input.value.trim().toLowerCase();
  
      datalist.innerHTML = '';
  
      if (query.length === 0) return;
  
      timeoutId = setTimeout(async () => {
        try {
          const response = await fetch(`/suggest?q=${encodeURIComponent(query)}`);
          if (!response.ok) throw new Error('Network response was not ok');
  
          const suggestions = await response.json();
          datalist.innerHTML = suggestions.map(s =>
            `<option value="${s}">${s}</option>`
          ).join('');
        } catch (error) {
          console.error('Suggestion fetch error:', error);
          datalist.innerHTML = '<option value="">Error loading suggestions</option>';
        }
      }, 300);
    });
  
    // Form Submission and Prediction Handling
    document.getElementById('symptom-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const symptomInputs = Array.from(document.querySelectorAll('.symptom'));
  
      // Validate inputs
      const emptyFields = symptomInputs.filter(input => input.value.trim() === '');
      if (emptyFields.length > 0) {
        alert(`Please fill in all symptom fields!\nMissing ${emptyFields.length} symptom(s).`);
        emptyFields[0].focus();
        emptyFields.forEach(input => input.classList.add('invalid'));
        return;
      }
  
      const symptoms = symptomInputs.map(input => input.value.trim());
      try {
        const response = await fetch('/predict', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ symptoms })
        });
        
        if (!response.ok) throw new Error('Prediction request failed');
        
        const result = await response.json();
        handlePredictionResponse(result);
      } catch (error) {
        console.error('Prediction error:', error);
        alert("Error processing your request. Please try again.");
      }
    });
  
    // Input Validation on Blur
    document.getElementById('symptom-inputs').addEventListener('blur', (e) => {
      if (!e.target.matches('.symptom')) return;
  
      const input = e.target;
      if (input.value.trim() === '') {
        input.classList.add('invalid');
        input.placeholder = "This field is required!";
      } else {
        input.classList.remove('invalid');
      }
    }, true);
  
    // Start Over Functionality
    document.getElementById('start-over').addEventListener('click', () => {
      document.getElementById('num-symptoms').value = '';
      document.getElementById('symptom-inputs').innerHTML = '';
      document.getElementById('result-container').style.display = 'none';
      document.getElementById('symptom-form').style.display = 'none';
    });
  
    // WHO Updates Handling
    async function loadWhoUpdates() {
      try {
        const response = await fetch('/who-updates');
        if (!response.ok) throw new Error('Network response was not ok');
        const diseases = await response.json();
  
        const container = document.getElementById('disease-container');
        container.innerHTML = diseases.map(disease => `
            <div class="disease-card card">
                <img src="/static/images/${disease.image}" alt="${disease.name}" class="disease-image">
                <div class="disease-content">
                    <h3>${disease.name}</h3>
                    <p>${disease.description}</p>
                    <a href="${disease.link}" target="_blank" class="wikipedia-link">
                        <i class="fas fa-external-link-alt"></i> More Info
                    </a>
                </div>
            </div>
        `).join('');
      } catch (error) {
        console.error('Error loading WHO data:', error);
        document.getElementById('disease-container').innerHTML =
          '<p class="error">Failed to load disease information. Please try again later.</p>';
      }
    }
    // Auto-load WHO updates on page load
    loadWhoUpdates();
  });
  
  // Handle Prediction Response
  function handlePredictionResponse(result) {
    const resultContainer = document.getElementById('result');
    const wikipediaUrl = `https://en.wikipedia.org/wiki/${result.disease.replace(/ /g, '_')}`;
  
    resultContainer.innerHTML = `
        <h3>Diagnosis Result</h3>
        <p class="diagnosis">${result.disease}</p>
        <div class="result-details">
            <p>Confidence: <strong>${result.probability.toFixed(2)}%</strong></p>
            <p>${result.description}</p>
            <a href="${wikipediaUrl}" target="_blank" class="wikipedia-link">
                <i class="fas fa-book-medical"></i> Learn more on Wikipedia
            </a>
        </div>
    `;
    document.getElementById('result-container').style.display = 'block';
  }
  