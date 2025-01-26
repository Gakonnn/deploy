document.getElementById('searchInput').addEventListener('input', function(e) {
  const query = e.target.value;
  window.location.href = `/search?q=${encodeURIComponent(query)}`;
});
