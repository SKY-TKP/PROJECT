import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import norm

def plot_confidence_interval(xbar, sd, n, confidence_level=0.95):
  """
  Plots a confidence interval for the population mean.

  Args:
    xbar: The sample mean.
    sd: The population standard deviation (or sample standard deviation if population sd is unknown).
    n: The sample size.
    confidence_level: The desired confidence level (e.g., 0.95 for 95% confidence).
  """

  alpha = 1 - confidence_level
  z_critical = norm.ppf(1 - alpha / 2)  # Z-score for the desired confidence level
  se = sd / np.sqrt(n)  # Standard error of the mean
  margin_of_error = z_critical * se
  lower_bound = xbar - margin_of_error
  upper_bound = xbar + margin_of_error

  # Generate x-axis values for the normal distribution
  x = np.linspace(xbar - 3 * se, xbar + 3 * se, 500)

  # Calculate the probability density function (PDF) of the normal distribution
  y = norm.pdf(x, loc=xbar, scale=se)

  # Plot the normal curve
  plt.plot(x, y, label='Normal Distribution')

  # Shade the area representing the confidence interval
  x_fill = np.linspace(lower_bound, upper_bound, 100)
  y_fill = norm.pdf(x_fill, loc=xbar, scale=se)
  plt.fill_between(x_fill, y_fill, 0, color='skyblue', alpha=0.5, label='Confidence Interval')

  # Add vertical lines for the lower and upper bounds
  plt.axvline(lower_bound, color='red', linestyle='--', label='Lower Bound')
  plt.axvline(upper_bound, color='red', linestyle='--', label='Upper Bound')

  # Add a vertical line for the sample mean
  plt.axvline(xbar, color='green', linestyle='-', label='Sample Mean')

  # Set the title and labels
  plt.title('Confidence Interval for Population Mean')
  plt.xlabel('Population Mean')
  plt.ylabel('Probability Density')

  # Add a legend
  plt.legend()

  # Display the plot
  plt.show()


  print(f"Sample Mean (xbar): {xbar}")
  print(f"Standard Deviation (sd): {sd}")
  print(f"Sample Size (n): {n}")
  print(f"Confidence Level: {confidence_level * 100}%")
  print(f"Lower Bound: {lower_bound}")
  print(f"Upper Bound: {upper_bound}")

# Example usage
plot_confidence_interval(xbar=655, sd=25, n=60, confidence_level=0.95)
