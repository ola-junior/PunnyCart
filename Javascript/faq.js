import { updateCartCount } from './main.js';

const darkToggle = document.getElementById('darkToggle');
const themeIcon = document.getElementById('themeIcon');
const backToTop = document.getElementById('backToTop');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');
const faqSearch = document.getElementById('faqSearch');
const categoryBtns = document.querySelectorAll('.category-btn');
const faqItems = document.querySelectorAll('.faq-item');
const faqSections = document.querySelectorAll('.faq-section');



// Mobile menu
if (mobileMenuToggle && mobileMenu) {
  mobileMenuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });
}

window.addEventListener('resize', () => {
  if (window.innerWidth >= 768 && mobileMenu) {
    mobileMenu.classList.add('hidden');
  }
});

// Back to top
if (backToTop) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTop.style.opacity = '1';
      backToTop.style.visibility = 'visible';
    } else {
      backToTop.style.opacity = '0';
      backToTop.style.visibility = 'hidden';
    }
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// FAQ Accordion functionality
function initAccordion() {
  const questions = document.querySelectorAll('.faq-question');
  
  questions.forEach(question => {
    question.addEventListener('click', () => {
      const answer = question.nextElementSibling;
      const isActive = answer.classList.contains('active');
      
      // Close all answers
      document.querySelectorAll('.faq-answer').forEach(ans => {
        ans.classList.remove('active');
      });
      document.querySelectorAll('.faq-question').forEach(q => {
        q.classList.remove('active');
      });
      
      // Open clicked answer if it wasn't active
      if (!isActive) {
        answer.classList.add('active');
        question.classList.add('active');
      }
    });
  });
}

// Search functionality
function initSearch() {
  if (!faqSearch) return;
  
  faqSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question span').textContent.toLowerCase();
      const answer = item.querySelector('.faq-answer').textContent.toLowerCase();
      const matches = question.includes(searchTerm) || answer.includes(searchTerm);
      
      if (searchTerm === '') {
        item.style.display = '';
      } else {
        item.style.display = matches ? '' : 'none';
      }
    });
    
    // Show sections only if they have visible items
    faqSections.forEach(section => {
      const visibleItems = Array.from(section.querySelectorAll('.faq-item')).some(item => item.style.display !== 'none');
      if (searchTerm === '') {
        section.style.display = '';
      } else {
        section.style.display = visibleItems ? '' : 'none';
      }
    });
    
    // Reset active filter button when searching
    if (searchTerm !== '') {
      categoryBtns.forEach(btn => btn.classList.remove('active'));
    }
  });
}

// Category filter functionality
function initCategoryFilter() {
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;
      
      // Update active button
      categoryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Clear search input
      if (faqSearch) faqSearch.value = '';
      
      // Filter sections
      faqSections.forEach(section => {
        if (category === 'all') {
          section.style.display = '';
        } else {
          const sectionCategory = section.dataset.category;
          section.style.display = sectionCategory === category ? '' : 'none';
        }
      });
      
      // Reset item display
      faqItems.forEach(item => {
        item.style.display = '';
      });
    });
  });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  initAccordion();
  initSearch();
  initCategoryFilter();
  updateCartCount();
});