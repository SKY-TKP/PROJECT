# create confident interval plot mean and create normal cruve to shade area 3 decimal places and can choose type sides confidence lower bound upper bound or two sided

import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import norm, t

def plot_confidence_interval(xbar, sd, n, alpha, confidence_type='two-sided'):
  """
  Plots a confidence interval for the population mean with a shaded area representing the confidence level.

  Args:
    xbar: The sample mean.
    sd: The population or sample standard deviation.
    n: The sample size.
    alpha: The significance level (e.g., 0.05 for a 95% confidence interval).
    confidence_type: The type of confidence interval ('lower-bound', 'upper-bound', 'two-sided').
  """

  if confidence_type == 'two-sided':
    confidence_level = 1 - alpha
    z_critical = norm.ppf(1 - alpha / 2)  # Z-score for a two-sided interval
    margin_of_error = z_critical * (sd / np.sqrt(n))
    lower_bound = xbar - margin_of_error
    upper_bound = xbar + margin_of_error

    # Generate x-values for the normal curve
    x = np.linspace(xbar - 3 * (sd / np.sqrt(n)), xbar + 3 * (sd / np.sqrt(n)), 500)
    y = norm.pdf(x, loc=xbar, scale=sd / np.sqrt(n))

    # Plot the normal curve
    plt.plot(x, y)

    # Shade the area representing the confidence interval
    x_fill = np.linspace(lower_bound, upper_bound, 100)
    y_fill = norm.pdf(x_fill, loc=xbar, scale=sd / np.sqrt(n))
    plt.fill_between(x_fill, y_fill, 0, color='skyblue', alpha=0.5)

    # Add labels and title
    plt.xlabel('Sample Mean')
    plt.ylabel('Probability Density')
    plt.title(f'{confidence_level * 100:.1f}% Confidence Interval')

    plt.axvline(xbar, color='red', linestyle='--', label='Sample Mean')
    plt.axvline(lower_bound, color='green', linestyle='--', label='Lower Bound')
    plt.axvline(upper_bound, color='green', linestyle='--', label='Upper Bound')
    plt.legend()
    plt.show()


    print(f"Confidence Interval: [{lower_bound:.3f}, {upper_bound:.3f}]")

  elif confidence_type == 'lower-bound':
    confidence_level = 1 - alpha
    z_critical = norm.ppf(1 - alpha)  # Z-score for a lower-bound interval
    margin_of_error = z_critical * (sd / np.sqrt(n))
    lower_bound = xbar - margin_of_error


    # Generate x-values for the normal curve
    x = np.linspace(xbar - 3 * (sd / np.sqrt(n)), xbar + 3 * (sd / np.sqrt(n)), 500)
    y = norm.pdf(x, loc=xbar, scale=sd / np.sqrt(n))

    # Plot the normal curve
    plt.plot(x, y)

    # Shade the area representing the confidence interval
    x_fill = np.linspace(lower_bound, xbar + 3 * (sd / np.sqrt(n)), 100)
    y_fill = norm.pdf(x_fill, loc=xbar, scale=sd / np.sqrt(n))
    plt.fill_between(x_fill, y_fill, 0, color='skyblue', alpha=0.5)


    # Add labels and title
    plt.xlabel('Sample Mean')
    plt.ylabel('Probability Density')
    plt.title(f'{confidence_level * 100:.1f}% Lower Bound Confidence Interval')

    plt.axvline(xbar, color='red', linestyle='--', label='Sample Mean')
    plt.axvline(lower_bound, color='green', linestyle='--', label='Lower Bound')
    plt.legend()
    plt.show()

    print(f"Lower Bound Confidence Interval: {lower_bound:.3f}")


  elif confidence_type == 'upper-bound':
    confidence_level = 1 - alpha
    z_critical = norm.ppf(1 - alpha)  # Z-score for a lower-bound interval
    margin_of_error = z_critical * (sd / np.sqrt(n))
    upper_bound = xbar + margin_of_error

    # Generate x-values for the normal curve
    x = np.linspace(xbar - 3 * (sd / np.sqrt(n)), xbar + 3 * (sd / np.sqrt(n)), 500)
    y = norm.pdf(x, loc=xbar, scale=sd / np.sqrt(n))

    # Plot the normal curve
    plt.plot(x, y)

    # Shade the area representing the confidence interval
    x_fill = np.linspace(xbar - 3 * (sd / np.sqrt(n)), upper_bound, 100)
    y_fill = norm.pdf(x_fill, loc=xbar, scale=sd / np.sqrt(n))
    plt.fill_between(x_fill, y_fill, 0, color='skyblue', alpha=0.5)

    # Add labels and title
    plt.xlabel('Sample Mean')
    plt.ylabel('Probability Density')
    plt.title(f'{confidence_level * 100:.1f}% Upper Bound Confidence Interval')

    plt.axvline(xbar, color='red', linestyle='--', label='Sample Mean')
    plt.axvline(upper_bound, color='green', linestyle='--', label='Upper Bound')

    plt.legend()
    plt.show()

    print(f"Upper Bound Confidence Interval: {upper_bound:.3f}")

  else:
    print("Invalid confidence type. Please choose 'lower-bound', 'upper-bound', or 'two-sided'.")




# Example usage
plot_confidence_interval(xbar=655, sd=25, n=60, alpha=0.05, confidence_type='two-sided')

plot_confidence_interval(xbar=655, sd=25, n=60, alpha=0.05, confidence_type='lower-bound')
plot_confidence_interval(xbar=655, sd=25, n=60, alpha=0.05, confidence_type='upper-bound')
